import { useState } from "react";
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
import { cn } from "@/lib/utils";

type Props = {
  images: string[];
  productName: string;
  badge?: string | null;
  badgeClassName?: string;
};

export default function ProductImageGallery({
  images,
  productName,
  badge,
  badgeClassName,
}: Props) {
  const [active, setActive] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const main = images[active] ?? images[0];

  return (
    <div className="space-y-3">
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted border border-border">
        {badge && (
          <span
            className={cn(
              "absolute top-4 left-4 z-20 text-xs font-bold px-3 py-1 rounded-full",
              badgeClassName ?? "bg-primary text-primary-foreground",
            )}
          >
            {badge}
          </span>
        )}
        <Lens hovering={hovering} setHovering={setHovering} zoomFactor={1.85} lensSize={200}>
          <CatalogImage
            src={main}
            alt={productName}
            className={cn(
              "w-full h-full object-contain p-4 transition-transform duration-300",
              hovering ? "scale-[1.03]" : "scale-100",
            )}
            loading="eager"
            decoding="async"
          />
        </Lens>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="absolute bottom-3 right-3 z-20 gap-1.5 shadow-md"
          onClick={() => setZoomOpen(true)}
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {images.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "relative shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden bg-background transition-colors",
                i === active ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50",
              )}
            >
              <CatalogImage src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="max-w-[95vw] w-full max-h-[90vh] p-0 gap-0 border-none bg-background/95">
          <DialogHeader className="px-4 pt-4 pb-0">
            <DialogTitle className="text-left font-display">{productName}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[calc(90vh-4rem)] p-4 flex items-center justify-center">
            <CatalogImage
              src={main}
              alt={productName}
              className="max-w-none w-auto h-auto min-w-[min(100%,480px)] max-h-[75vh] object-contain select-none"
              style={{ transform: "scale(1.35)", transformOrigin: "center center" }}
              draggable={false}
            />
          </div>
          <p className="text-xs text-muted-foreground px-4 pb-4 text-center">
            Scroll to pan · High-resolution preview
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
