import { useEffect, useState } from "react";
import { Download, Maximize2 } from "lucide-react";
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

function fileNameFrom(productName: string, src: string): string {
  const base = productName.trim().replace(/[^\w\-]+/g, "-").replace(/^-+|-+$/g, "") || "product";
  const ext = src.match(/\.(png|jpe?g|webp|gif)(?:$|\?)/i)?.[1]?.toLowerCase() || "jpg";
  return `${base}.${ext === "jpeg" ? "jpg" : ext}`;
}

async function saveCatalogPhoto(src: string, productName: string): Promise<void> {
  const name = fileNameFrom(productName, src);
  try {
    const res = await fetch(src, { mode: "cors", credentials: "omit" });
    if (!res.ok) throw new Error("fetch");
    const blob = await res.blob();
    const file = new File([blob], name, { type: blob.type || "image/jpeg" });
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
    if (typeof nav.share === "function" && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: productName });
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    window.open(src, "_blank", "noopener,noreferrer");
  }
}

export default function ProductImageGallery({
  images,
  productName,
  preferredSrc,
}: Props) {
  const { t } = useLang();
  const [active, setActive] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [canLens, setCanLens] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const apply = () => setCanLens(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const preferredNorm = preferredSrc ? normalizeCatalogImageUrl(preferredSrc) || preferredSrc : "";
  const displayImages = (() => {
    if (!preferredNorm) return images;
    const has = images.some((src) => (normalizeCatalogImageUrl(src) || src) === preferredNorm);
    return has ? images : [preferredSrc as string, ...images];
  })();
  const displayKey = displayImages.join("\n");

  useEffect(() => {
    if (!preferredNorm) {
      setActive(0);
      return;
    }
    const i = displayImages.findIndex((src) => (normalizeCatalogImageUrl(src) || src) === preferredNorm);
    setActive(i >= 0 ? i : 0);
  }, [preferredNorm, displayKey]);

  const main = displayImages[active] ?? displayImages[0];
  const extra = Math.max(0, displayImages.length - VISIBLE_THUMBS);
  const rail = displayImages.slice(0, VISIBLE_THUMBS);

  const photo = (
    <CatalogImage
      key={main}
      src={main}
      alt={productName}
      data-allow-save=""
      className={cn(
        "h-full w-full object-contain px-1.5 py-1 transition-transform duration-300",
        hovering ? "scale-[1.03]" : "scale-100",
      )}
      loading="eager"
      decoding="async"
    />
  );

  const thumbs = (vertical: boolean) =>
    displayImages.length > 1 ? (
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
              canLens ? (
                <Lens hovering={hovering} setHovering={setHovering} zoomFactor={1.85} lensSize={200}>
                  {photo}
                </Lens>
              ) : (
                photo
              )
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">—</div>
            )}
            <div className="absolute bottom-3 right-3 z-20 flex gap-2">
              {main ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-9 w-9 rounded-lg border border-black/[0.08] bg-white shadow-sm"
                  onClick={() => void saveCatalogPhoto(main, productName)}
                  aria-label={t("pdp_save_image")}
                  data-allow-save=""
                >
                  <Download className="h-4 w-4 text-navy" />
                </Button>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-9 w-9 rounded-lg border border-black/[0.08] bg-white shadow-sm"
                onClick={() => setZoomOpen(true)}
                aria-label={t("pdp_zoom")}
              >
                <Maximize2 className="h-4 w-4 text-navy" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      {thumbs(false)}

      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="max-h-[90vh] w-full max-w-[95vw] gap-0 border-none bg-background/95 p-0">
          <DialogHeader className="flex flex-row items-center justify-between gap-3 px-4 pb-0 pr-12 pt-4">
            <DialogTitle className="text-left font-display">{productName}</DialogTitle>
            {main ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="shrink-0 rounded-lg border border-black/[0.08] bg-white"
                onClick={() => void saveCatalogPhoto(main, productName)}
                data-allow-save=""
              >
                <Download className="mr-1.5 h-4 w-4" />
                {t("pdp_save_image")}
              </Button>
            ) : null}
          </DialogHeader>
          <div className="flex max-h-[calc(90vh-4rem)] items-center justify-center overflow-auto p-4">
            {main ? (
              <CatalogImage
                src={main}
                alt={productName}
                data-allow-save=""
                className="h-auto max-h-[75vh] w-auto min-w-[min(100%,480px)] max-w-none object-contain"
                style={{ transform: "scale(1.25)", transformOrigin: "center center" }}
              />
            ) : null}
          </div>
          {displayImages.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto px-4 pb-4">
              {displayImages.map((src, i) => (
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
