/**
 * Production-only client deterrents (right-click / common DevTools shortcuts).
 *
 * This is NOT a security boundary — anyone can bypass it. Real protection comes
 * from keeping secrets on the API server and never shipping them in VITE_* vars.
 */
export function initClientHardening(): void {
  if (import.meta.env.DEV) return;

  const block = (event: Event) => {
    event.preventDefault();
  };

  document.addEventListener("contextmenu", block);

  document.addEventListener(
    "keydown",
    (event) => {
      const key = event.key.toLowerCase();
      const ctrlOrMeta = event.ctrlKey || event.metaKey;
      const shift = event.shiftKey;

      const opensDevTools =
        key === "f12" ||
        (ctrlOrMeta && shift && (key === "i" || key === "j" || key === "c")) ||
        (ctrlOrMeta && key === "u");

      if (opensDevTools) {
        event.preventDefault();
      }
    },
    { capture: true },
  );
}
