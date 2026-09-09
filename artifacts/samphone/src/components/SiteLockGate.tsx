import { FormEvent, ReactNode, useState } from "react";

const STORAGE_KEY = "samphone_preview_unlock";
const SITE_PASSWORD = "RAHASAYA@SAMPHONE";

function isUnlocked(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export default function SiteLockGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(isUnlocked);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (password === SITE_PASSWORD) {
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
      setError(false);
      setUnlocked(true);
      return;
    }
    setError(true);
  };

  if (unlocked) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-white">
      <form
        onSubmit={submit}
        className="flex w-full max-w-sm flex-col gap-3 px-6"
        autoComplete="off"
      >
        <input
          type="password"
          name="site-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(false);
          }}
          placeholder="Password"
          className="h-11 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-neutral-500"
          autoFocus
        />
        {error ? (
          <p className="text-sm text-red-600">Incorrect password</p>
        ) : null}
        <button
          type="submit"
          className="h-11 w-full rounded-md bg-neutral-900 text-sm font-medium text-white"
        >
          Enter
        </button>
      </form>
    </div>
  );
}
