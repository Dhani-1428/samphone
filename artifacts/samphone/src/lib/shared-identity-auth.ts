import { STORE_EMAIL } from "@/config/samphone";
import { WooCommerceFetchError } from "@/lib/woocommerce";
import {
  cloudAuth,
  clerkSync,
  cloudMfaVerify,
  CloudMfaRequiredError,
  type CloudAuthSession,
  type ClerkSyncFields,
} from "@/lib/samphone-cloud";

export { CloudMfaRequiredError as MfaRequiredError };

type ClerkSignInApi = {
  create: (params: { identifier: string; password: string }) => Promise<{
    status: string | null;
    createdSessionId?: string | null;
  }>;
};

type ClerkSetActive = (params: { session: string }) => Promise<void>;

/**
 * Same identity as the Expo app:
 * 1) POST /auth/login first so ADMIN_EMAIL + ADMIN_PASSWORD open an admin session
 *    even when Clerk has a different password for the same inbox.
 * 2) Fall back to Clerk email/password → clerk-sync → app JWT.
 */
export async function loginWithSharedIdentity(opts: {
  email: string;
  password: string;
  clerk?: {
    isLoaded: boolean;
    signIn: ClerkSignInApi | null | undefined;
    setActive: ClerkSetActive | undefined;
    getToken: () => Promise<string | null>;
  };
}): Promise<CloudAuthSession> {
  const email = opts.email.trim();
  const password = opts.password;
  if (!email || !password) {
    throw new WooCommerceFetchError("Email and password are required.");
  }

  const adminInbox = email.toLowerCase() === STORE_EMAIL.toLowerCase();
  if (adminInbox) {
    try {
      return await cloudAuth("/auth/admin-login", { email, password });
    } catch (e) {
      if (e instanceof CloudMfaRequiredError) throw e;
      if (e instanceof WooCommerceFetchError && (e.status === 429 || e.status === 400 || e.status === 401)) {
        /* fall through to /auth/login */
      } else if (e instanceof WooCommerceFetchError) {
        throw e;
      }
    }
    return cloudAuth("/auth/login", { email, password });
  }

  try {
    return await cloudAuth("/auth/login", { email, password });
  } catch (e) {
    if (e instanceof CloudMfaRequiredError) throw e;
    if (e instanceof WooCommerceFetchError && e.status === 429) throw e;
  }

  if (opts.clerk?.isLoaded && opts.clerk.signIn && opts.clerk.setActive) {
    try {
      const attempt = await opts.clerk.signIn.create({ identifier: email, password });
      if (attempt.status === "complete" && attempt.createdSessionId) {
        await opts.clerk.setActive({ session: attempt.createdSessionId });
        const clerkToken = await opts.clerk.getToken();
        if (clerkToken && clerkToken.length >= 20) {
          return await clerkSync(clerkToken);
        }
      }
    } catch (e) {
      if (e instanceof CloudMfaRequiredError) throw e;
    }
  }

  return cloudAuth("/auth/login", { email, password });
}

export async function verifySharedMfa(opts: {
  mfaToken: string;
  code: string;
  email?: string;
}): Promise<CloudAuthSession> {
  return cloudMfaVerify(opts);
}

type ClerkSignUpApi = {
  create: (params: {
    emailAddress: string;
    password: string;
    firstName?: string;
    unsafeMetadata?: Record<string, string>;
  }) => Promise<{
    status: string | null;
    createdSessionId?: string | null;
  }>;
};

/**
 * Register on cloud (source of truth for shop JWT), then mirror into Clerk when available
 * so Apple/Google/email Clerk UI matches the app.
 */
export async function registerWithSharedIdentity(opts: {
  email: string;
  password: string;
  name: string;
  fields: Record<string, string | boolean | number | undefined>;
  clerk?: {
    isLoaded: boolean;
    signUp: ClerkSignUpApi | null | undefined;
    setActive: ClerkSetActive | undefined;
    getToken: () => Promise<string | null>;
  };
  syncFields?: ClerkSyncFields;
}): Promise<CloudAuthSession> {
  const email = opts.email.trim();
  const session = await cloudAuth("/auth/register", {
    email,
    password: opts.password,
    name: opts.name,
    ...opts.fields,
  });

  if (opts.clerk?.isLoaded && opts.clerk.signUp && opts.clerk.setActive) {
    try {
      const attempt = await opts.clerk.signUp.create({
        emailAddress: email,
        password: opts.password,
        firstName: opts.name.split(/\s+/)[0] || opts.name,
        unsafeMetadata: {
          accountType: String(opts.fields.account_type ?? opts.syncFields?.account_type ?? "b2c"),
        },
      });
      if (attempt.status === "complete" && attempt.createdSessionId) {
        await opts.clerk.setActive({ session: attempt.createdSessionId });
        const clerkToken = await opts.clerk.getToken();
        if (clerkToken && clerkToken.length >= 20) {
          return await clerkSync(clerkToken, {
            name: opts.name,
            email,
            ...opts.syncFields,
          });
        }
      }
    } catch {
      /* cloud session already issued — Clerk mirror is best-effort */
    }
  }

  return session;
}
