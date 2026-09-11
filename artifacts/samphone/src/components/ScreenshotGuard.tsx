import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/contexts/AuthContext";
import { canCaptureSite } from "@/lib/admin-access";

const BODY_CLASS = "no-site-capture";
const VEIL_CLASS = "site-capture-veiled";

function isAway(): boolean {
  return typeof document === "undefined" ? false : !document.hasFocus() || document.hidden;
}

function isAuthSurface(): boolean {
  if (typeof window === "undefined") return false;
  const p = window.location.pathname.toLowerCase();
  return (
    p.includes("/login") ||
    p.includes("/register") ||
    p.includes("/sso-callback") ||
    p.includes("/auth/continue") ||
    p.includes("/admin")
  );
}

/**
 * Capture lock for everyone except admin samphone.pt@gmail.com.
 * Blanks the window as soon as it is not focused so OS screenshot tools
 * (Print Screen, Snipping Tool, Cmd+Shift+3/4/5) usually get a white frame.
 * Login / register / admin stay visible so sign-in is not blocked.
 */
export default function ScreenshotGuard({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const allowed = canCaptureSite(user) || isAuthSurface();
  const [veiled, setVeiled] = useState(false);

  useEffect(() => {
    document.body.classList.toggle(BODY_CLASS, !allowed);
    if (allowed) {
      document.body.classList.remove(VEIL_CLASS);
      setVeiled(false);
      return;
    }

    const apply = (on: boolean) => {
      setVeiled(on);
      document.body.classList.toggle(VEIL_CLASS, on);
    };

    const sync = () => apply(isAway());
    const cover = () => apply(true);

    const block = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const printScreen = key === "printscreen" || e.keyCode === 44;
      const macGrab = (e.metaKey || e.ctrlKey) && e.shiftKey && ["3", "4", "5"].includes(e.key);
      const printPage = (e.ctrlKey || e.metaKey) && key === "p";
      const savePage = (e.ctrlKey || e.metaKey) && key === "s";
      if (printScreen || macGrab || printPage || savePage) {
        cover();
        block(e);
      }
    };

    const onDrag = (e: DragEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest?.("img")) block(e);
    };

    sync();
    const tick = window.setInterval(sync, 120);

    window.addEventListener("blur", cover);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("pagehide", cover);
    document.addEventListener("contextmenu", block, true);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("keyup", onKey, true);
    document.addEventListener("dragstart", onDrag, true);
    window.addEventListener("beforeprint", cover);

    return () => {
      window.clearInterval(tick);
      document.body.classList.remove(BODY_CLASS, VEIL_CLASS);
      window.removeEventListener("blur", cover);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pagehide", cover);
      document.removeEventListener("contextmenu", block, true);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("keyup", onKey, true);
      document.removeEventListener("dragstart", onDrag, true);
      window.removeEventListener("beforeprint", cover);
    };
  }, [allowed]);

  return (
    <>
      {children}
      {!allowed && veiled
        ? createPortal(<div className="site-capture-veil" aria-hidden />, document.body)
        : null}
    </>
  );
}
