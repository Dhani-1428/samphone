import { SignIn, SignUp } from "@clerk/clerk-react";

const appearance = {
  layout: {
    socialButtonsVariant: "iconButton" as const,
    socialButtonsPlacement: "top" as const,
  },
  elements: {
    rootBox: "w-auto mx-0",
    card: "shadow-none border-0 bg-transparent p-0",
    header: "hidden",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    dividerRow: "hidden",
    form: "hidden",
    formFieldRow: "hidden",
    formButtonPrimary: "hidden",
    footer: "hidden",
    footerAction: "hidden",
    identityPreview: "hidden",
    socialButtons: "flex items-center justify-center gap-4",
    socialButtonsIconButton:
      "h-12 w-12 rounded-full border border-black/[0.12] bg-white shadow-sm hover:bg-neutral-50",
  },
};

/** Clerk-hosted Google/Apple icons (same OAuth as the Samphone app). */
export function ClerkSocialHost({
  mode,
  completeUrl,
}: {
  mode: "sign-in" | "sign-up";
  completeUrl: string;
}) {
  if (mode === "sign-up") {
    return (
      <div className="login-clerk-social">
        <SignUp
          routing="hash"
          forceRedirectUrl={completeUrl}
          fallbackRedirectUrl={completeUrl}
          appearance={appearance}
        />
      </div>
    );
  }
  return (
    <div className="login-clerk-social">
      <SignIn
        routing="hash"
        forceRedirectUrl={completeUrl}
        fallbackRedirectUrl={completeUrl}
        appearance={appearance}
      />
    </div>
  );
}
