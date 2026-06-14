import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const quoteFormPath = resolve(__dirname, "../client/src/pages/QuoteForm.tsx");

const oldBlock = `          await createJobItemMutation.mutateAsync({
            jobId,
            wallId: savedWall.id,
            itemType: product.productType,
            productId: product.productId ? Number(product.productId) : undefined,
            wallWidthMm: wall.wallWidthMm,
            wallHeightMm: wall.wallHeightMm,
            cabinetWidthMm: product.cabinetWidthMm,
            cabinetHeightMm: product.cabinetHeightMm,
            cabinetDepthMm: product.cabinetDepthMm,
            cabinetHeightFromFloorMm: product.cabinetHeightFromFloorMm,
            quantityRequired: product.quantity,
            unitPrice: product.unitPrice,
            totalPrice: product.quantity * product.unitPrice,
            itemDetails: buildItemDetails(product),
          });`;

const newBlock = `          await createJobItemMutation.mutateAsync({
            jobId,
            wallId: savedWall.id,
            itemType: product.productType,
            productId: product.productId ? Number(product.productId) : undefined,
            wallWidthMm: wall.wallWidthMm,
            wallHeightMm: wall.wallHeightMm,
            ...(product.cabinetWidthMm != null ? { cabinetWidthMm: product.cabinetWidthMm } : {}),
            ...(product.cabinetHeightMm != null ? { cabinetHeightMm: product.cabinetHeightMm } : {}),
            ...(product.cabinetDepthMm != null ? { cabinetDepthMm: product.cabinetDepthMm } : {}),
            ...(product.cabinetHeightFromFloorMm != null ? { cabinetHeightFromFloorMm: product.cabinetHeightFromFloorMm } : {}),
            quantityRequired: product.quantity,
            unitPrice: product.unitPrice,
            totalPrice: product.quantity * product.unitPrice,
            itemDetails: buildItemDetails(product),
          });`;

const source = readFileSync(quoteFormPath, "utf8");
const newline = source.includes("\r\n") ? "\r\n" : "\n";
const normalize = (text) => text.replace(/\r\n/g, "\n");
const normalizedSource = normalize(source);
const normalizedOldBlock = normalize(oldBlock);
const normalizedNewBlock = normalize(newBlock);
const normalizedServerSaveMarker = normalize("const saveQuoteMutation = trpc.jobs.saveQuote.useMutation();");

if (normalizedSource.includes(normalizedNewBlock)) {
  console.log("QuoteForm save payload already patched.");
  process.exit(0);
}

if (normalizedSource.includes(normalizedServerSaveMarker)) {
  console.log("QuoteForm now uses server-side saveQuote mutation. Legacy payload patch skipped.");
  process.exit(0);
}

if (!normalizedSource.includes(normalizedOldBlock)) {
  throw new Error("QuoteForm save payload block not found. Manual review required.");
}

const target = oldBlock.split("\n").join(newline);
const replacement = newBlock.split("\n").join(newline);
writeFileSync(quoteFormPath, source.replace(target, replacement), "utf8");
console.log("Patched QuoteForm save payload to omit null cabinet fields.");
