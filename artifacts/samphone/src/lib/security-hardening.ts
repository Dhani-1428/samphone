/**
 * Production-only client deterrents (right-click / common DevTools shortcuts).
 *
 * This is NOT a security boundary — anyone can bypass it. Real protection comes
 * from keeping secrets on the API server and never shipping them in VITE_* vars.
 */
export function initClientHardening(): void {
  if (import.meta.env.DEV) return;

  document.addEventListener("contextmenu", (event) => {
    const node = event.target;
    const onMedia = node instanceof Element && node.closest("img, picture, video, [data-allow-save]");
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    // Phones need the native long-press Save Image menu. Desktop still cannot Inspect.
    if (onMedia && coarsePointer) return;
    event.preventDefault();
  });

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
