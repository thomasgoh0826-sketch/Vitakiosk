import { useEffect, useMemo, useState } from "react";

import type { Product } from "../types";

interface ProductImageProps {
  product: Product;
  className?: string;
  variant?: "panel" | "viewer" | "candidate";
}

function productInitials(name: string) {
  const compactName = name.replace(/[^a-z0-9]/gi, "");
  return compactName.slice(0, 2).toUpperCase() || "RX";
}

function safeImageUrl(url: string | null | undefined) {
  const trimmed = url?.trim();
  if (!trimmed) {
    return null;
  }
  if (
    trimmed.startsWith("/")
    || trimmed.startsWith("http://")
    || trimmed.startsWith("https://")
  ) {
    return trimmed;
  }
  return null;
}

function selectProductImage(product: Product) {
  const primaryImage = product.images?.find((image) => image.isPrimary) ?? product.images?.[0];
  const url = safeImageUrl(product.imageUrl)
    ?? safeImageUrl(primaryImage?.url)
    ?? safeImageUrl(product.thumbnailUrl);

  if (!url) {
    return null;
  }

  return {
    url,
    alt: primaryImage?.alt?.trim() || `${product.name} product image`,
  };
}

function ProductImage({
  product,
  className = "",
  variant = "panel",
}: ProductImageProps) {
  const selectedImage = useMemo(() => selectProductImage(product), [product]);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  useEffect(() => {
    setFailedUrl(null);
  }, [selectedImage?.url, product.id]);

  const showImage = selectedImage && failedUrl !== selectedImage.url;

  return (
    <div
      className={`product-image-frame product-image-${variant} ${className}`.trim()}
      data-has-product-image={showImage ? "true" : "false"}
    >
      <span className="product-image-skeleton" aria-hidden="true" />
      {showImage ? (
        <img
          alt={selectedImage.alt}
          loading="lazy"
          src={selectedImage.url}
          onError={() => setFailedUrl(selectedImage.url)}
        />
      ) : (
        <span className="product-image-fallback" aria-hidden="true">
          {productInitials(product.name)}
        </span>
      )}
    </div>
  );
}

export default ProductImage;
