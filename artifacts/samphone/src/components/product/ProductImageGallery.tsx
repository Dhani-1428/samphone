import { useEffect, useState } from "react";
import { Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Lens } from "@/components/ui/lens";
import CatalogImage from "@/components/CatalogImage";
import { useLang } from "@/contexts/LanguageContext";
import { normalizeCatalogImageUrl } from "@/config/samphone";
import { cn } from "@/lib/utils";

type Props = {
  images: string[];
  productName: string;
  badge?: string | null;
  badgeClassName?: string;
  preferredSrc?: string | null;
};

const VISIBLE_THUMBS = 4;

export default function ProductImageGallery({
  images,
  productName,
  preferredSrc,
}: Props) {
  const { t } = useLang();
  const [active, setActive] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);

  const imageKey = images.join("\n");

  useEffect(() => {
    if (!preferredSrc) {
      setActive(0);
      return;
    }
    const want = normalizeCatalogImageUrl(preferredSrc) || preferredSrc;
    const i = images.findIndex((src) => (normalizeCatalogImageUrl(src) || src) === want);
    setActive(i >= 0 ? i : 0);
  }, [preferredSrc, imageKey]);

  const main = images[active] ?? images[0];
  const extra = Math.max(0, images.length - VISIBLE_THUMBS);
  const rail = images.slice(0, VISIBLE_THUMBS);

  const thumbs = (vertical: boolean) =>
    images.length > 1 ? (
      <div className={cn(vertical ? "hidden w-[76px] shrink-0 flex-col gap-2 md:flex" : "flex gap-2 overflow-x-auto pb-1 md:hidden")}>
        {rail.map((src, i) => (
          <button
            key={`${src}-${i}`}
            type="button"
            onClick={() => setActive(i)}
            className={cn(
              "relative overflow-hidden rounded-lg border-2 bg-white transition-colors",
              vertical ? "h-[76px] w-[76px]" : "h-16 w-16 shrink-0",
              i === active ? "border-[#111111]" : "border-black/[0.08] hover:border-[#111111]/50",
            )}
          >
            <CatalogImage src={src} alt="" className="h-full w-full object-contain p-1" />
          </button>
        ))}
        {extra > 0 ? (
          <button
            type="button"
            onClick={() => setZoomOpen(true)}
            className={cn(
              "flex items-center justify-center rounded-lg border border-black/[0.08] bg-neutral-100 text-[11px] font-semibold leading-tight text-[#111111]",
              vertical ? "h-[76px] w-[76px] px-1" : "h-16 w-16 shrink-0",
            )}
          >
            +{extra} {t("pdp_view_more")}
          </button>
        ) : null}
      </div>
    ) : null;

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        {thumbs(true)}
        <div className="relative min-w-0 flex-1 overflow-hidden rounded-xl border border-black/[0.08] bg-white">
          <div className="relative aspect-square">
            {main ? (
              <Lens hovering={hovering} setHovering={setHovering} zoomFactor={1.85} lensSize={200}>
                <CatalogImage
                  key={main}
                  src={main}
                  alt={productName}
                  className={cn(
                    "h-full w-full object-contain px-1.5 py-1 transition-transform duration-300",
                    hovering ? "scale-[1.03]" : "scale-100",
                  )}
                  loading="eager"
                  decoding="async"
                />
              </Lens>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">—</div>
            )}
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute bottom-3 right-3 z-20 h-9 w-9 rounded-lg border border-black/[0.08] bg-white shadow-sm"
              onClick={() => setZoomOpen(true)}
              aria-label={t("pdp_zoom")}
            >
              <Maximize2 className="h-4 w-4 text-navy" />
            </Button>
          </div>
        </div>
      </div>
      {thumbs(false)}

      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="max-h-[90vh] w-full max-w-[95vw] gap-0 border-none bg-background/95 p-0">
          <DialogHeader className="px-4 pb-0 pt-4">
            <DialogTitle className="text-left font-display">{productName}</DialogTitle>
          </DialogHeader>
          <div className="flex max-h-[calc(90vh-4rem)] items-center justify-center overflow-auto p-4">
            {main ? (
              <CatalogImage
                src={main}
                alt={productName}
                className="h-auto max-h-[75vh] w-auto min-w-[min(100%,480px)] max-w-none select-none object-contain"
                style={{ transform: "scale(1.25)", transformOrigin: "center center" }}
                draggable={false}
              />
            ) : null}
          </div>
          {images.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto px-4 pb-4">
              {images.map((src, i) => (
                <button
                  key={`zoom-${src}-${i}`}
                  type="button"
                  onClick={() => setActive(i)}
                  className={cn(
                    "h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2",
                    i === active ? "border-[#111111]" : "border-black/[0.08]",
                  )}
                >
                  <CatalogImage src={src} alt="" className="h-full w-full object-contain p-1" />
                </button>
              ))}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
