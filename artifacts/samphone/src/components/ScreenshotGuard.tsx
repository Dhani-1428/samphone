import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { canCaptureSite } from "@/lib/admin-access";

const BODY_CLASS = "no-site-capture";

/**
 * Deters browser print, right-click save, and common capture shortcuts
 * unless the signed-in account is the store admin (samphone.pt@gmail.com).
 * OS-level screenshots cannot be fully blocked on the web.
 */
export default function ScreenshotGuard({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const allowed = canCaptureSite(user);

  useEffect(() => {
    document.body.classList.toggle(BODY_CLASS, !allowed);
    if (allowed) return;

    const block = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const printScreen = key === "printscreen" || e.keyCode === 44;
      const macGrab = e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key);
      const printPage = (e.ctrlKey || e.metaKey) && key === "p";
      const savePage = (e.ctrlKey || e.metaKey) && key === "s";
      if (printScreen || macGrab || printPage || savePage) block(e);
    };

    const onDrag = (e: DragEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest?.("img")) block(e);
    };

    document.addEventListener("contextmenu", block, true);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("keyup", onKey, true);
    document.addEventListener("dragstart", onDrag, true);
    window.addEventListener("beforeprint", block);

    return () => {
      document.body.classList.remove(BODY_CLASS);
      document.removeEventListener("contextmenu", block, true);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("keyup", onKey, true);
      document.removeEventListener("dragstart", onDrag, true);
      window.removeEventListener("beforeprint", block);
    };
  }, [allowed]);

  return <>{children}</>;
}
