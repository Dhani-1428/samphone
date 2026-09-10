import { FormEvent, ReactNode, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

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
  const [showPassword, setShowPassword] = useState(false);
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

  return (
    <>
      <div className={unlocked ? undefined : "hidden"} aria-hidden={!unlocked}>
        {children}
      </div>
      {unlocked ? null : (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-white">
      <form
        onSubmit={submit}
        className="flex w-full max-w-sm flex-col gap-3 px-6"
        autoComplete="off"
      >
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            name="site-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            placeholder="Password"
            className="h-11 w-full rounded-md border border-neutral-300 bg-white px-3 pr-11 text-sm text-neutral-900 outline-none focus:border-neutral-500"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
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
      )}
    </>
  );
}
