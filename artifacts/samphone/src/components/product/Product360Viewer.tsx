import { useCallback, useRef, useState } from "react";
import { RotateCw } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

type Props = {
  imageSrc: string;
  productName: string;
};

const FRAMES = 36;

/** Interactive drag-to-rotate: simulates 360° using CSS 3D (single source image; swap for multi-frame assets in production) */
export default function Product360Viewer({ imageSrc, productName }: Props) {
  const { t } = useLang();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState(0);
  const dragging = useRef(false);

  const setFromClientX = useCallback((clientX: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - r.left, 0), r.width);
    const next = Math.round((x / r.width) * (FRAMES - 1));
    setFrame(next);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setFromClientX(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    setFromClientX(e.clientX);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    dragging.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const rotationY = (frame / (FRAMES - 1)) * 360 - 180;
  const rotationZ = Math.sin((frame / FRAMES) * Math.PI * 2) * 4;

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-b from-muted/50 to-background p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
        <RotateCw className="w-4 h-4 text-primary" />
        {t("product360_title")}
      </div>
      <p className="text-xs text-muted-foreground mb-4">{t("product360_hint")}</p>
      <div
        ref={wrapRef}
        className={cn(
          "relative aspect-square max-h-[min(420px,55vw)] mx-auto rounded-xl bg-muted/80 overflow-hidden cursor-ew-resize touch-pan-y select-none",
          "border border-border/80",
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <div
          className="absolute inset-0 flex items-center justify-center [perspective:1200px]"
          style={{ perspective: "1200px" }}
        >
          <div
            className="relative w-[70%] h-[70%] [transform-style:preserve-3d] transition-transform duration-75 ease-out will-change-transform"
            style={{
              transform: `rotateY(${rotationY}deg) rotateZ(${rotationZ}deg)`,
            }}
          >
            <img
              src={imageSrc}
              alt={productName}
              className="w-full h-full object-contain drop-shadow-2xl pointer-events-none"
              draggable={false}
            />
          </div>
        </div>
        <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
          <div className="flex gap-0.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 w-6 rounded-full transition-colors",
                  Math.floor((frame / FRAMES) * 12) === i ? "bg-primary" : "bg-border",
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
