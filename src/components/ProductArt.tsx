import { FLAVORS } from "@/lib/flavors";
import type { Product } from "@/lib/types";
import { CakeIllustration } from "./CakeIllustration";

export function ProductArt({ product, alt, className = "" }: { product: Product; alt: string; className?: string }) {
  const th = FLAVORS[product.flavor];
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: `radial-gradient(circle at 50% 40%, #fff 0%, ${th.glow} 70%)` }}
    >
      {product.image && /^(https:\/\/|data:image\/(png|jpe?g|webp|avif);base64,|\/)/i.test(product.image) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.image} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <CakeIllustration flavor={product.flavor} className="absolute inset-0 m-auto h-[88%] w-[88%]" />
      )}
    </div>
  );
}
