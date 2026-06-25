import type { ProductTypeSlug, WallProduct } from "./types";

export const customMeasuredProductTypes: ProductTypeSlug[] = [
  "floating_cabinet",
  "side_tower",
  "shelving",
];

export const productTypeSlugAliases: Record<ProductTypeSlug, string[]> = {
  cladding: ["cladding"],
  acoustic_panel: ["acoustic_panel", "acoustic-panels"],
  floating_cabinet: ["floating_cabinet", "floating-cabinet", "floating-cabinets"],
  fireplace: ["fireplace"],
  mirror: ["mirror", "mirrors"],
  marble_sheet: ["marble_sheet", "marble-sheet"],
  tv_backdrop: ["tv_backdrop", "tv-backdrop", "tv-backdrops"],
  side_tower: ["side_tower", "side-tower", "side-towers"],
  shelving: ["shelving", "shelf", "shelves"],
  custom_item: [],
};

export const productTypeLabels: Record<ProductTypeSlug, string> = {
  cladding: "Cladding",
  acoustic_panel: "Acoustic Panel",
  floating_cabinet: "Floating Cabinet",
  fireplace: "Fireplace",
  mirror: "Mirror",
  marble_sheet: "Marble Sheet",
  tv_backdrop: "TV Backdrop",
  side_tower: "Side Tower",
  shelving: "Shelving",
  custom_item: "Custom Item",
};

export function formatProductHeading(product: Pick<WallProduct, "productType" | "productName">) {
  const rawName = product.productName?.trim();
  if (!rawName) return productTypeLabels[product.productType];

  const normalized = rawName.toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === product.productType) {
    return productTypeLabels[product.productType];
  }

  return rawName;
}

export function panelTypes(productType: ProductTypeSlug) {
  return ["cladding", "acoustic_panel", "marble_sheet"].includes(productType);
}

export function usesCatalogProductSelection(productType: ProductTypeSlug) {
  return !customMeasuredProductTypes.includes(productType) && productType !== "custom_item";
}

export function resolveCatalogProductTypeId(
  productType: ProductTypeSlug | null,
  productTypes: Array<{ id: number; slug: string }> | undefined
) {
  if (!productType || !productTypes) return 0;
  const catalogType = productType === "tv_backdrop" ? "marble_sheet" : productType;
  return productTypes.find(type => productTypeSlugAliases[catalogType].includes(type.slug))?.id || 0;
}
