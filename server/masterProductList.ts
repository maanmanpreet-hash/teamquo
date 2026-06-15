import fs from "node:fs";
import path from "node:path";

type StockedProductTypeSlug =
  | "cladding"
  | "acoustic_panel"
  | "marble_sheet"
  | "mirror"
  | "fireplace";

type CustomProductTypeSlug =
  | "floating_cabinet"
  | "tv_backdrop"
  | "side_tower"
  | "shelving";

type ProductTypeSlug = StockedProductTypeSlug | CustomProductTypeSlug;

type MasterlistRow = {
  product_type: string;
  variant_name: string;
  sku: string;
  design: string;
  width_mm: string;
  height_mm: string;
  depth_mm: string;
  unit: string;
  price_per_unit: string;
  is_active: string;
  notes: string;
};

type PreviewProductType = {
  id: number;
  name: string;
  slug: string;
  description: string;
  isActive: number;
  createdAt: Date;
  updatedAt: Date;
};

type PreviewProduct = {
  id: number;
  productTypeId: number;
  name: string;
  design: string | null;
  widthMm: number | null;
  heightMm: number | null;
  depthMm: number | null;
  pricePerUnit: number;
  description: string | null;
  isActive: number;
  createdAt: Date;
  updatedAt: Date;
};

type PreviewCatalog = {
  productTypes: PreviewProductType[];
  products: PreviewProduct[];
};

const PRODUCT_TYPE_DEFS: Array<{
  id: number;
  slug: ProductTypeSlug;
  name: string;
  routerSlug: string;
  description: string;
  stocked: boolean;
}> = [
  { id: 1, slug: "cladding", name: "Cladding", routerSlug: "cladding", description: "Wall cladding panels", stocked: true },
  { id: 2, slug: "acoustic_panel", name: "Acoustic Panels", routerSlug: "acoustic-panels", description: "Sound-absorbing acoustic panels", stocked: true },
  { id: 3, slug: "marble_sheet", name: "UV Panel (Marble Sheet)", routerSlug: "marble-sheet", description: "PVC marble sheet panels", stocked: true },
  { id: 4, slug: "mirror", name: "Mirrors", routerSlug: "mirrors", description: "Designer LED mirrors", stocked: true },
  { id: 5, slug: "fireplace", name: "Fireplace", routerSlug: "fireplace", description: "Designer fireplaces", stocked: true },
  { id: 6, slug: "floating_cabinet", name: "Floating Cabinets", routerSlug: "floating-cabinets", description: "Custom floating cabinets", stocked: false },
  { id: 7, slug: "tv_backdrop", name: "TV Backdrop", routerSlug: "tv-backdrop", description: "TV backdrop use case backed by marble sheet variants", stocked: false },
  { id: 8, slug: "side_tower", name: "Side Towers", routerSlug: "side-towers", description: "Custom side towers", stocked: false },
  { id: 9, slug: "shelving", name: "Shelving", routerSlug: "shelving", description: "Custom shelving", stocked: false },
];

const STOCKED_PRODUCT_TYPE_IDS = new Map<StockedProductTypeSlug, number>(
  PRODUCT_TYPE_DEFS.filter(def => def.stocked).map(def => [def.slug as StockedProductTypeSlug, def.id])
);

const PRODUCT_ID_BASES: Record<StockedProductTypeSlug, number> = {
  cladding: 100,
  acoustic_panel: 200,
  marble_sheet: 300,
  mirror: 400,
  fireplace: 500,
};

let cachedCatalog: PreviewCatalog | null = null;

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      const nextChar = line[index + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map(value => value.trim());
}

function parseOptionalInteger(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function parseRequiredInteger(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : 0;
}

function parseIsActive(value: string) {
  return value.trim().toLowerCase() === "true" ? 1 : 0;
}

function buildDescription(row: MasterlistRow) {
  if (!row.notes.trim()) return null;
  return `Notes: ${row.notes.trim()}`;
}

function parseMasterlistRows(csvText: string) {
  const lines = csvText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const rows: MasterlistRow[] = [];

  for (const line of lines.slice(1)) {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])) as MasterlistRow;
    rows.push(row);
  }

  return rows;
}

function buildFallbackCatalog(): PreviewCatalog {
  const timestamp = new Date();
  return {
    productTypes: PRODUCT_TYPE_DEFS.map(def => ({
      id: def.id,
      name: def.name,
      slug: def.routerSlug,
      description: def.description,
      isActive: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
    products: [
      {
        id: 101,
        productTypeId: 1,
        name: "Fallback Cladding Panel",
        design: "Fallback",
        widthMm: 168,
        heightMm: 2900,
        depthMm: 24,
        pricePerUnit: 1500,
        description: "Notes: Fallback preview product",
        isActive: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
  };
}

export function getMasterProductCatalog(): PreviewCatalog {
  if (cachedCatalog) return cachedCatalog;

  const masterlistPath = path.resolve(import.meta.dirname, "..", "product-masterlist.csv");

  try {
    if (!fs.existsSync(masterlistPath)) {
      cachedCatalog = buildFallbackCatalog();
      return cachedCatalog;
    }

    const timestamp = new Date();
    const csvText = fs.readFileSync(masterlistPath, "utf8");
    const rows = parseMasterlistRows(csvText);
    const counters = new Map<StockedProductTypeSlug, number>();
    const products: PreviewProduct[] = [];

    for (const row of rows) {
      const slug = row.product_type as StockedProductTypeSlug;
      const productTypeId = STOCKED_PRODUCT_TYPE_IDS.get(slug);
      if (!productTypeId) continue;

      const nextOffset = (counters.get(slug) ?? 0) + 1;
      counters.set(slug, nextOffset);

      products.push({
        id: PRODUCT_ID_BASES[slug] + nextOffset,
        productTypeId,
        name: row.variant_name.trim(),
        design: row.design.trim() || null,
        widthMm: parseOptionalInteger(row.width_mm),
        heightMm: parseOptionalInteger(row.height_mm),
        depthMm: parseOptionalInteger(row.depth_mm),
        pricePerUnit: parseRequiredInteger(row.price_per_unit),
        description: buildDescription(row),
        isActive: parseIsActive(row.is_active),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    cachedCatalog = {
      productTypes: PRODUCT_TYPE_DEFS.map(def => ({
        id: def.id,
        name: def.name,
        slug: def.routerSlug,
        description: def.description,
        isActive: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      })),
      products,
    };

    return cachedCatalog;
  } catch (error) {
    console.warn("[Masterlist] Failed to load product-masterlist.csv, using fallback preview catalog.", error);
    cachedCatalog = buildFallbackCatalog();
    return cachedCatalog;
  }
}
