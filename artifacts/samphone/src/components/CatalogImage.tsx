import type { ImgHTMLAttributes } from "react";
import { catalogImageReferrerPolicy } from "@/config/samphone";
import { cn } from "@/lib/utils";

/** WordPress uploads keep a referrer; third-party CDNs do not. */
export default function CatalogImage({ src, className, ...rest }: ImgHTMLAttributes<HTMLImageElement>) {
  const policy = typeof src === "string" ? catalogImageReferrerPolicy(src) : "no-referrer";
  return (
    <img
      src={src}
      referrerPolicy={policy}
      className={cn("catalog-photo", className)}
      {...rest}
    />
  );
}
