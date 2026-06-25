import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import {
  adminProcedure,
  publicProcedure,
  protectedProcedure,
  router,
} from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { generateQuoteHTML, getCustomerQuoteLogoUrlForPdf } from "./pdf";
import { renderCustomerQuotePdfBuffer } from "./customerQuotePdf";
import { buildJobMaterialSummary } from "./jobMaterials";
import { formatQuoteNumber } from "../shared/quote";
import { getMasterProductCatalog } from "./masterProductList";
import { generateInternalMaterialListHtml } from "../shared/materialListHtml";
import fs from "fs";
import path from "path";

const supportedItemTypes = [
  "cladding",
  "acoustic_panel",
  "floating_cabinet",
  "fireplace",
  "mirror",
  "marble_sheet",
  "tv_backdrop",
  "side_tower",
  "shelving",
  "custom_item",
] as const;

const now = () => new Date();
const isPreviewMode = async () => !(await db.getDb());
const { productTypes: previewProductTypes, products: previewProducts } = getMasterProductCatalog();

const previewCladdingVariants = previewProducts
  .filter(product => product.productTypeId === 1)
  .map(product => ({
    id: product.id,
    name: product.name,
    design: product.design,
    widthMm: product.widthMm,
    heightMm: product.heightMm,
    pricePerUnit: product.pricePerUnit,
    description: product.description,
    isActive: 1,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  }));

const previewOperators: any[] = [
  { id: 1, name: "Manpreet", isActive: 1, createdAt: now(), updatedAt: now() },
  { id: 2, name: "Test Installer", isActive: 1, createdAt: now(), updatedAt: now() },
];

let nextJobId = 9001;
let nextWallId = 8001;
let nextItemId = 7001;

const previewJobs: any[] = [];

const previewWalls: any[] = [];

const previewJobItems: any[] = [];

let previewStoreLoaded = false;

function getPreviewStorePath() {
  return process.env.PREVIEW_STORE_PATH || path.resolve(import.meta.dirname, "..", ".preview-quotes.json");
}

function loadPreviewStore() {
  const previewStorePath = getPreviewStorePath();
  if (previewStoreLoaded && previewStorePath === (loadPreviewStore as any).loadedPath) return;

  previewStoreLoaded = true;
  (loadPreviewStore as any).loadedPath = previewStorePath;
  nextJobId = 9001;
  nextWallId = 8001;
  nextItemId = 7001;
  previewJobs.splice(0, previewJobs.length);
  previewWalls.splice(0, previewWalls.length);
  previewJobItems.splice(0, previewJobItems.length);

  if (!fs.existsSync(previewStorePath)) return;

  try {
    const parsed = JSON.parse(fs.readFileSync(previewStorePath, "utf8"));
    nextJobId = Number.isFinite(parsed?.nextJobId) ? Math.max(1, Math.round(parsed.nextJobId)) : nextJobId;
    nextWallId = Number.isFinite(parsed?.nextWallId) ? Math.max(1, Math.round(parsed.nextWallId)) : nextWallId;
    nextItemId = Number.isFinite(parsed?.nextItemId) ? Math.max(1, Math.round(parsed.nextItemId)) : nextItemId;
    if (Array.isArray(parsed?.jobs)) previewJobs.push(...parsed.jobs);
    if (Array.isArray(parsed?.walls)) previewWalls.push(...parsed.walls);
    if (Array.isArray(parsed?.jobItems)) previewJobItems.push(...parsed.jobItems);
  } catch (error) {
    console.warn("[Preview Store] Failed to load preview quotes:", error);
  }
}

function persistPreviewStore() {
  try {
    const previewStorePath = getPreviewStorePath();
    const tempPath = `${previewStorePath}.tmp`;
    fs.writeFileSync(
      tempPath,
      JSON.stringify(
        {
          nextJobId,
          nextWallId,
          nextItemId,
          jobs: previewJobs,
          walls: previewWalls,
          jobItems: previewJobItems,
        },
        null,
        2
      ),
      "utf8"
    );
    fs.rmSync(previewStorePath, { force: true });
    fs.renameSync(tempPath, previewStorePath);
  } catch (error) {
    console.warn("[Preview Store] Failed to persist preview quotes:", error);
  }
}

const previewVolumeDiscounts: any[] = [
  { id: 1, productTypeId: 1, minQuantity: 1, discountPercent: 0, createdAt: now(), updatedAt: now() },
  { id: 2, productTypeId: 1, minQuantity: 10, discountPercent: 10, createdAt: now(), updatedAt: now() },
  { id: 3, productTypeId: 2, minQuantity: 1, discountPercent: 0, createdAt: now(), updatedAt: now() },
  { id: 4, productTypeId: 2, minQuantity: 10, discountPercent: 10, createdAt: now(), updatedAt: now() },
];

function productJoinFields(item: any) {
  const product = previewProducts.find(product => product.id === item.productId);
  return {
    productName: product?.name,
    productDesign: product?.design,
    productWidthMm: product?.widthMm,
    productHeightMm: product?.heightMm,
    productDepthMm: product?.depthMm,
  };
}

function previewGetWallsWithItemsByJobId(jobId: number) {
  return previewWalls
    .filter(wall => wall.jobId === jobId)
    .map(wall => ({
      ...wall,
      products: previewJobItems
        .filter(item => item.jobId === jobId && item.wallId === wall.id)
        .map(item => ({ ...item, ...productJoinFields(item) })),
    }));
}

function mergeItemDetailsIntoWallProducts(wallRows: any[], items: any[]) {
  const itemDetailsById = new Map(items.map(item => [item.id, item.itemDetails]));
  return wallRows.map(wall => ({
    ...wall,
    products: (wall.products || []).map((product: any) => ({
      ...product,
      itemDetails: product.itemDetails ?? itemDetailsById.get(product.id) ?? null,
    })),
  }));
}

async function assertOwnsJob(jobId: number, userId: number) {
  if (await isPreviewMode()) {
    loadPreviewStore();
    const job = previewJobs.find(job => job.id === jobId);
    if (!job || job.userId !== userId) throw new Error("Unauthorized");
    return job;
  }
  const job = await db.getJobById(jobId);
  if (!job || job.userId !== userId) {
    throw new Error("Unauthorized");
  }
  return job;
}

async function assertOwnsWall(wallId: number, userId: number) {
  if (await isPreviewMode()) {
    loadPreviewStore();
    const wall = previewWalls.find(wall => wall.id === wallId);
    if (!wall) throw new Error("Wall not found");
    await assertOwnsJob(wall.jobId, userId);
    return wall;
  }
  const wall = await db.getWallById(wallId);
  if (!wall) throw new Error("Wall not found");
  await assertOwnsJob(wall.jobId, userId);
  return wall;
}

async function assertOwnsJobItem(itemId: number, userId: number) {
  if (await isPreviewMode()) {
    loadPreviewStore();
    const item = previewJobItems.find(item => item.id === itemId);
    if (!item) throw new Error("Job item not found");
    await assertOwnsJob(item.jobId, userId);
    return item;
  }
  const item = await db.getJobItemById(itemId);
  if (!item) throw new Error("Job item not found");
  await assertOwnsJob(item.jobId, userId);
  return item;
}

const jobInputSchema = z.object({
  clientName: z.string().min(1).optional(),
  clientEmail: z.string().email().nullish(),
  clientPhone: z.string().nullish(),
  clientAddress: z.string().nullish(),
  suburb: z.string().nullish(),
  appointmentDate: z.string().nullish(),
  appointmentTime: z.string().nullish(),
  referenceImageUrl: z.string().nullish(),
  operatorName: z.string().nullish(),
  totalEstimate: z.number().int().nonnegative().optional(),
  notes: z.string().nullish(),
});

const jobUpdateSchema = jobInputSchema.extend({ id: z.number() });
const quoteSaveWallProductSchema = z.object({
  itemType: z.enum(supportedItemTypes),
  productId: z.number().optional(),
  claddingVariantId: z.number().optional(),
  wallWidthMm: z.number().int().positive().optional(),
  wallHeightMm: z.number().int().positive().optional(),
  cabinetWidthMm: z.number().int().positive().optional(),
  cabinetHeightMm: z.number().int().positive().optional(),
  cabinetDepthMm: z.number().int().positive().optional(),
  cabinetHeightFromFloorMm: z.number().int().nonnegative().optional(),
  quantityRequired: z.number().int().positive().optional(),
  unitPrice: z.number().int().nonnegative().optional(),
  totalPrice: z.number().int().nonnegative().optional(),
  manualPriceOverride: z.number().int().nonnegative().optional(),
  itemDetails: z.string().optional(),
});

const quoteSaveWallSchema = z.object({
  wallType: z.enum(["regular", "garage", "custom"]).default("regular"),
  wallName: z.string().optional(),
  wallWidthMm: z.number().int().positive().optional(),
  wallHeightMm: z.number().int().positive().optional(),
  notes: z.string().optional(),
  products: z.array(quoteSaveWallProductSchema),
});

const saveQuoteSchema = jobInputSchema.extend({
  id: z.number().optional(),
  walls: z.array(quoteSaveWallSchema),
});

const jobItemCreateSchema = z.object({
  jobId: z.number(),
  itemType: z.enum(supportedItemTypes),
  productId: z.number().optional(),
  claddingVariantId: z.number().optional(),
  wallWidthMm: z.number().int().positive().optional(),
  wallHeightMm: z.number().int().positive().optional(),
  cabinetWidthMm: z.number().int().positive().optional(),
  cabinetHeightMm: z.number().int().positive().optional(),
  cabinetDepthMm: z.number().int().positive().optional(),
  cabinetHeightFromFloorMm: z.number().int().nonnegative().optional(),
  wallId: z.number().optional(),
  quantityRequired: z.number().int().positive().optional(),
  unitPrice: z.number().int().nonnegative().optional(),
  totalPrice: z.number().int().nonnegative().optional(),
  manualPriceOverride: z.number().int().nonnegative().optional(),
  itemDetails: z.string().optional(),
});

const jobItemUpdateSchema = z.object({
  id: z.number(),
  quantityRequired: z.number().int().positive().optional(),
  totalPrice: z.number().int().nonnegative().optional(),
  manualPriceOverride: z.number().int().nonnegative().optional(),
  itemDetails: z.string().optional(),
});

function buildJobInput(input: z.infer<typeof jobInputSchema>, userId: number) {
  return {
    userId,
    clientName: input.clientName || "[Draft]",
    clientEmail: input.clientEmail || null,
    clientPhone: input.clientPhone || null,
    clientAddress: input.clientAddress || null,
    suburb: input.suburb || null,
    appointmentDate: input.appointmentDate ? new Date(input.appointmentDate) : null,
    appointmentTime: input.appointmentTime || null,
    referenceImageUrl: input.referenceImageUrl || null,
    operatorName: input.operatorName || null,
    // Guardrail: `totalEstimate` is a legacy/ambiguous persisted field name.
    // In Team QUO quote workflow it should represent the customer-facing total
    // derived from manual wall Supply & Install prices, not internal material cost.
    totalEstimate: input.totalEstimate,
    // Guardrail: `notes` is an overloaded legacy metadata field. Quote-level
    // structured data such as customer add-ons should be encoded/decoded through
    // shared helpers instead of ad-hoc string manipulation.
    notes: input.notes || null,
    status: "quoted" as const,
  };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  cladding: router({
    list: publicProcedure.query(async () => (await isPreviewMode() ? previewCladdingVariants : db.getAllCladdingVariants())),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      if (await isPreviewMode()) return previewCladdingVariants.find(variant => variant.id === input.id);
      return db.getCladdingVariantById(input.id);
    }),
    create: protectedProcedure.input(z.object({ name: z.string().min(1), design: z.string().min(1), widthMm: z.number().int().positive(), heightMm: z.number().int().positive(), pricePerUnit: z.number().int().nonnegative(), description: z.string().optional() })).mutation(async ({ input }) => {
      if (await isPreviewMode()) return undefined;
      return db.createCladdingVariant({ ...input, isActive: 1 });
    }),
    update: protectedProcedure.input(z.object({ id: z.number(), name: z.string().optional(), design: z.string().optional(), widthMm: z.number().int().positive().optional(), heightMm: z.number().int().positive().optional(), pricePerUnit: z.number().int().nonnegative().optional(), description: z.string().optional() })).mutation(async ({ input }) => {
      if (await isPreviewMode()) return undefined;
      const { id, ...updates } = input;
      return db.updateCladdingVariant(id, updates);
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      if (await isPreviewMode()) return true;
      return db.deleteCladdingVariant(input.id);
    }),
  }),

  jobs: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (await isPreviewMode()) {
        loadPreviewStore();
        return previewJobs.filter(job => job.userId === ctx.user.id);
      }
      return db.getJobsByUserId(ctx.user.id);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
      if (await isPreviewMode()) {
        loadPreviewStore();
        const job = previewJobs.find(job => job.id === input.id);
        if (job && job.userId !== ctx.user.id) throw new Error("Unauthorized");
        return job;
      }
      const job = await db.getJobById(input.id);
      if (job && job.userId !== ctx.user.id) throw new Error("Unauthorized");
      return job;
    }),
    create: protectedProcedure.input(jobInputSchema).mutation(async ({ input, ctx }) => {
      if (await isPreviewMode()) {
        loadPreviewStore();
        const job = { id: nextJobId++, ...buildJobInput(input, ctx.user.id), stage: "quoting", stageStatus: "in_progress", createdAt: now(), updatedAt: now() };
        previewJobs.unshift(job);
        persistPreviewStore();
        return job;
      }
      return db.createJob(buildJobInput(input, ctx.user.id));
    }),
    updateStatus: protectedProcedure.input(z.object({ id: z.number(), status: z.enum(["quoted", "booked", "commenced", "completed", "cancelled"]) })).mutation(async ({ input, ctx }) => {
      const job = await assertOwnsJob(input.id, ctx.user.id);
      if (await isPreviewMode()) {
        Object.assign(job, { status: input.status, updatedAt: now() });
        persistPreviewStore();
        return job;
      }
      return db.updateJobStatus(input.id, input.status);
    }),
    update: protectedProcedure.input(jobUpdateSchema).mutation(async ({ input, ctx }) => {
      const job = await assertOwnsJob(input.id, ctx.user.id);
      const { id, appointmentDate, ...updates } = input;
      const updateData = Object.fromEntries(
        Object.entries({
          ...updates,
          appointmentDate: appointmentDate === undefined ? undefined : appointmentDate ? new Date(appointmentDate) : null,
        }).filter(([, value]) => value !== undefined)
      );
      if (await isPreviewMode()) {
        loadPreviewStore();
        Object.assign(job, updateData, { updatedAt: now() });
        persistPreviewStore();
        return job;
      }
      return db.updateJob(id, updateData);
    }),
    saveQuote: protectedProcedure.input(saveQuoteSchema).mutation(async ({ input, ctx }) => {
      if (input.id) {
        await assertOwnsJob(input.id, ctx.user.id);
      }

      const previewMode = await isPreviewMode();
      const jobInput = buildJobInput(input, ctx.user.id);

      if (previewMode) {
        loadPreviewStore();
        const existingJob = input.id ? previewJobs.find(job => job.id === input.id) : undefined;
        const jobId = existingJob?.id ?? nextJobId++;
        const savedJob = existingJob
          ? Object.assign(existingJob, { ...jobInput, updatedAt: now() })
          : { id: jobId, ...jobInput, stage: "quoting", stageStatus: "in_progress", createdAt: now(), updatedAt: now() };

        if (!existingJob) {
          previewJobs.unshift(savedJob);
        }

        for (let i = previewJobItems.length - 1; i >= 0; i--) if (previewJobItems[i].jobId === jobId) previewJobItems.splice(i, 1);
        for (let i = previewWalls.length - 1; i >= 0; i--) if (previewWalls[i].jobId === jobId) previewWalls.splice(i, 1);

        for (const wall of input.walls) {
          const savedWall = {
            id: nextWallId++,
            jobId,
            wallType: wall.wallType,
            wallName: wall.wallName,
            wallWidthMm: wall.wallWidthMm,
            wallHeightMm: wall.wallHeightMm,
            notes: wall.notes,
            createdAt: now(),
            updatedAt: now(),
          };
          previewWalls.push(savedWall);

          for (const product of wall.products) {
            previewJobItems.push({
              id: nextItemId++,
              jobId,
              wallId: savedWall.id,
              ...product,
              createdAt: now(),
              updatedAt: now(),
            });
          }
        }

        persistPreviewStore();
        return savedJob;
      }

      return db.saveQuoteWithContents({
        jobId: input.id,
        job: jobInput,
        walls: input.walls,
      });
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      await assertOwnsJob(input.id, ctx.user.id);
      if (await isPreviewMode()) {
        loadPreviewStore();
        for (let i = previewJobItems.length - 1; i >= 0; i--) if (previewJobItems[i].jobId === input.id) previewJobItems.splice(i, 1);
        for (let i = previewWalls.length - 1; i >= 0; i--) if (previewWalls[i].jobId === input.id) previewWalls.splice(i, 1);
        const index = previewJobs.findIndex(job => job.id === input.id);
        if (index >= 0) previewJobs.splice(index, 1);
        persistPreviewStore();
        return true;
      }
      return db.deleteJobWithContents(input.id);
    }),
  }),

  jobItems: router({
    getByJobId: protectedProcedure.input(z.object({ jobId: z.number() })).query(async ({ input, ctx }) => {
      await assertOwnsJob(input.jobId, ctx.user.id);
      if (await isPreviewMode()) {
        loadPreviewStore();
        return previewJobItems.filter(item => item.jobId === input.jobId);
      }
      return db.getJobItemsByJobId(input.jobId);
    }),
    generatePDF: protectedProcedure.input(z.object({ jobId: z.number() })).query(async ({ input, ctx }) => {
      const job = await assertOwnsJob(input.jobId, ctx.user.id);
      const previewMode = await isPreviewMode();
      const items = previewMode ? previewJobItems.filter(item => item.jobId === input.jobId) : await db.getJobItemsByJobId(input.jobId);
      if (!items.length) throw new Error("Cannot generate PDF until the quote has at least one saved product.");
      const variants = previewMode ? previewCladdingVariants : await db.getAllCladdingVariants();
      const products = previewMode ? previewProducts : await db.getAllProducts();
      const wallRows = previewMode ? previewWalls.filter(wall => wall.jobId === input.jobId) : await db.getWallsByJobId(input.jobId);
      const variantMap = new Map(variants.map(v => [v.id, v]));
      const productMap = new Map(products.map(product => [product.id, product]));
      const wallMap = new Map(wallRows.map(wall => [wall.id, wall]));
      // Guardrail: generateQuoteHTML is customer-facing. Internal material cost,
      // product-level pricing, labour, margin, and markup must not leak through
      // this route even though internal calculation data exists elsewhere.
      const html = generateQuoteHTML(job as any, items as any, variantMap as any, productMap as any, undefined, undefined, wallMap as any);
      return { html, jobId: job.id, clientName: job.clientName, quoteNumber: formatQuoteNumber(job as any) };
    }),
    generatePDFFile: protectedProcedure.input(z.object({ jobId: z.number() })).query(async ({ input, ctx }) => {
      const job = await assertOwnsJob(input.jobId, ctx.user.id);
      const previewMode = await isPreviewMode();
      const items = previewMode ? previewJobItems.filter(item => item.jobId === input.jobId) : await db.getJobItemsByJobId(input.jobId);
      if (!items.length) throw new Error("Cannot generate PDF until the quote has at least one saved product.");
      const variants = previewMode ? previewCladdingVariants : await db.getAllCladdingVariants();
      const products = previewMode ? previewProducts : await db.getAllProducts();
      const wallRows = previewMode ? previewWalls.filter(wall => wall.jobId === input.jobId) : await db.getWallsByJobId(input.jobId);
      const variantMap = new Map(variants.map(v => [v.id, v]));
      const productMap = new Map(products.map(product => [product.id, product]));
      const wallMap = new Map(wallRows.map(wall => [wall.id, wall]));
      const quoteNumber = formatQuoteNumber(job as any);
      const fileName = `${quoteNumber}-${(job.clientName || "quote").replace(/[\\/:*?"<>|]+/g, "-")}.pdf`;
      // Guardrail: this is the downloadable customer quote path, so the same
      // customer-facing pricing restrictions apply here as in preview HTML.
      const html = generateQuoteHTML(
        job as any,
        items as any,
        variantMap as any,
        productMap as any,
        undefined,
        getCustomerQuoteLogoUrlForPdf(),
        wallMap as any
      );
      const pdfBuffer = await renderCustomerQuotePdfBuffer(html, fileName);
      return {
        base64: pdfBuffer.toString("base64"),
        fileName,
        sizeBytes: pdfBuffer.byteLength,
      };
    }),
    generateMaterialList: protectedProcedure.input(z.object({ jobId: z.number() })).query(async ({ input, ctx }) => {
      const job = await assertOwnsJob(input.jobId, ctx.user.id);
      const previewMode = await isPreviewMode();
      const items = previewMode ? previewJobItems.filter(item => item.jobId === input.jobId) : await db.getJobItemsByJobId(input.jobId);
      if (!items.length) throw new Error("Cannot generate material list until the quote has at least one saved product.");
      const products = previewMode ? previewProducts : await db.getAllProducts();
      const wallRows = previewMode ? previewWalls.filter(wall => wall.jobId === input.jobId) : await db.getWallsByJobId(input.jobId);
      const productMap = new Map(products.map(product => [product.id, product]));
      const wallMap = new Map(wallRows.map(wall => [wall.id, wall]));
      const summary = buildJobMaterialSummary(items as any, productMap as any, wallMap as any);
      const html = generateInternalMaterialListHtml({
        quoteNumber: formatQuoteNumber(job as any),
        clientName: job.clientName,
        clientAddress: job.clientAddress || undefined,
        generatedDateText: new Date().toLocaleDateString(),
        summary,
      });
      return { html, jobId: job.id, clientName: job.clientName, quoteNumber: formatQuoteNumber(job as any) };
    }),
    create: protectedProcedure.input(jobItemCreateSchema).mutation(async ({ input, ctx }) => {
      await assertOwnsJob(input.jobId, ctx.user.id);
      if (input.wallId) {
        const wall = await assertOwnsWall(input.wallId, ctx.user.id);
        if (wall.jobId !== input.jobId) throw new Error("Wall does not belong to this quote");
      }
      const { jobId, ...itemData } = input;
      if (await isPreviewMode()) {
        loadPreviewStore();
        const item = { id: nextItemId++, jobId, ...itemData, createdAt: now(), updatedAt: now() };
        previewJobItems.push(item);
        persistPreviewStore();
        return item;
      }
      return db.createJobItem({ jobId, ...itemData });
    }),
    update: protectedProcedure.input(jobItemUpdateSchema).mutation(async ({ input, ctx }) => {
      const item = await assertOwnsJobItem(input.id, ctx.user.id);
      const { id, ...updates } = input;
      if (await isPreviewMode()) {
        Object.assign(item, updates, { updatedAt: now() });
        persistPreviewStore();
        return item;
      }
      return db.updateJobItem(id, updates);
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      await assertOwnsJobItem(input.id, ctx.user.id);
      if (await isPreviewMode()) {
        loadPreviewStore();
        const index = previewJobItems.findIndex(item => item.id === input.id);
        if (index >= 0) previewJobItems.splice(index, 1);
        persistPreviewStore();
        return true;
      }
      return db.deleteJobItem(input.id);
    }),
    deleteByJobId: protectedProcedure.input(z.object({ jobId: z.number() })).mutation(async ({ input, ctx }) => {
      await assertOwnsJob(input.jobId, ctx.user.id);
      if (await isPreviewMode()) {
        loadPreviewStore();
        for (let i = previewJobItems.length - 1; i >= 0; i--) if (previewJobItems[i].jobId === input.jobId) previewJobItems.splice(i, 1);
        persistPreviewStore();
        return true;
      }
      return db.deleteJobItemsByJobId(input.jobId);
    }),
  }),

  products: router({
    listTypes: publicProcedure.query(async () => (await isPreviewMode() ? previewProductTypes : db.getAllProductTypes())),
    listByType: publicProcedure.input(z.object({ productTypeId: z.number() })).query(async ({ input }) => {
      if (await isPreviewMode()) return previewProducts.filter(product => product.productTypeId === input.productTypeId && product.isActive === 1);
      return db.getAllProducts(input.productTypeId);
    }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      if (await isPreviewMode()) return previewProducts.find(product => product.id === input.id);
      return db.getProductById(input.id);
    }),
    create: adminProcedure.input(z.object({ productTypeId: z.number(), name: z.string().min(1), design: z.string().optional(), widthMm: z.number().int().positive().optional(), heightMm: z.number().int().positive().optional(), depthMm: z.number().int().positive().optional(), pricePerUnit: z.number().int().nonnegative(), description: z.string().optional() })).mutation(async ({ input }) => {
      if (await isPreviewMode()) {
        const product = {
          id: Math.max(...previewProducts.map(product => product.id)) + 1,
          productTypeId: input.productTypeId,
          name: input.name,
          design: input.design ?? null,
          widthMm: input.widthMm ?? null,
          heightMm: input.heightMm ?? null,
          depthMm: input.depthMm ?? null,
          pricePerUnit: input.pricePerUnit,
          description: input.description ?? null,
          isActive: 1,
          createdAt: now(),
          updatedAt: now(),
        };
        previewProducts.push(product);
        return product;
      }
      return db.createProduct(input);
    }),
    update: adminProcedure.input(z.object({ id: z.number(), name: z.string().optional(), design: z.string().optional(), widthMm: z.number().int().positive().optional(), heightMm: z.number().int().positive().optional(), depthMm: z.number().int().positive().optional(), pricePerUnit: z.number().int().nonnegative().optional(), description: z.string().optional(), isActive: z.number().optional() })).mutation(async ({ input }) => {
      if (await isPreviewMode()) {
        const product = previewProducts.find(product => product.id === input.id);
        if (!product) return undefined;
        const { id, ...updates } = input;
        Object.assign(product, updates, { updatedAt: now() });
        return product;
      }
      const { id, ...updates } = input;
      return db.updateProduct(id, updates);
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      if (await isPreviewMode()) {
        const product = previewProducts.find(product => product.id === input.id);
        if (product) product.isActive = 0;
        return true;
      }
      return db.deleteProduct(input.id);
    }),
    getDiscounts: publicProcedure.input(z.object({ productTypeId: z.number() })).query(async ({ input }) => {
      if (await isPreviewMode()) return previewVolumeDiscounts.filter(discount => discount.productTypeId === input.productTypeId);
      return db.getVolumeDiscounts(input.productTypeId);
    }),
    calculateDiscount: publicProcedure.input(z.object({ productTypeId: z.number(), quantity: z.number().int().positive() })).query(async ({ input }) => {
      if (await isPreviewMode()) {
        return previewVolumeDiscounts.filter(discount => discount.productTypeId === input.productTypeId && input.quantity >= discount.minQuantity).at(-1)?.discountPercent ?? 0;
      }
      return db.calculateDiscount(input.productTypeId, input.quantity);
    }),
  }),

  operators: router({
    list: publicProcedure.query(async () => (await isPreviewMode() ? previewOperators : db.getAllOperators())),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      if (await isPreviewMode()) return previewOperators.find(operator => operator.id === input.id);
      return db.getOperatorById(input.id);
    }),
    create: adminProcedure.input(z.object({ name: z.string().min(1, "Operator name is required") })).mutation(async ({ input }) => {
      if (await isPreviewMode()) {
        const operator = { id: Math.max(...previewOperators.map(operator => operator.id)) + 1, name: input.name, isActive: 1, createdAt: now(), updatedAt: now() };
        previewOperators.push(operator);
        return operator;
      }
      return db.createOperator({ name: input.name, isActive: 1 });
    }),
    update: adminProcedure.input(z.object({ id: z.number(), name: z.string().optional(), isActive: z.number().optional() })).mutation(async ({ input }) => {
      if (await isPreviewMode()) {
        const operator = previewOperators.find(operator => operator.id === input.id);
        if (!operator) return undefined;
        const { id, ...updates } = input;
        Object.assign(operator, updates, { updatedAt: now() });
        return operator;
      }
      const { id, ...updates } = input;
      return db.updateOperator(id, updates);
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      if (await isPreviewMode()) {
        const operator = previewOperators.find(operator => operator.id === input.id);
        if (operator) operator.isActive = 0;
        return true;
      }
      return db.deleteOperator(input.id);
    }),
  }),

  storage: router({
    uploadImage: protectedProcedure.input(z.object({ fileName: z.string(), base64Data: z.string(), mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]) })).mutation(async ({ input, ctx }) => {
      const buffer = Buffer.from(input.base64Data, "base64");
      if (buffer.length > 5 * 1024 * 1024) throw new Error("Image exceeds 5MB limit");
      if (await isPreviewMode()) return { url: `data:${input.mimeType};base64,${input.base64Data}` };
      const { storagePut } = await import("./storage");
      const { url } = await storagePut(`reference-images/${ctx.user.id}/${Date.now()}-${input.fileName}`, buffer, input.mimeType);
      return { url };
    }),
  }),

  walls: router({
    create: protectedProcedure.input(z.object({ jobId: z.number(), wallType: z.enum(["regular", "garage", "custom"]).default("regular"), wallName: z.string().optional(), wallWidthMm: z.number().int().positive().optional(), wallHeightMm: z.number().int().positive().optional(), notes: z.string().optional() })).mutation(async ({ input, ctx }) => {
      await assertOwnsJob(input.jobId, ctx.user.id);
      if (await isPreviewMode()) {
        loadPreviewStore();
        const wall = { id: nextWallId++, ...input, createdAt: now(), updatedAt: now() };
        previewWalls.push(wall);
        persistPreviewStore();
        return wall;
      }
      return db.createWall(input);
    }),
    getByJobId: protectedProcedure.input(z.object({ jobId: z.number() })).query(async ({ input, ctx }) => {
      await assertOwnsJob(input.jobId, ctx.user.id);
      if (await isPreviewMode()) {
        loadPreviewStore();
        return previewGetWallsWithItemsByJobId(input.jobId);
      }
      const wallRows = await db.getWallsWithItemsByJobId(input.jobId);
      const items = await db.getJobItemsByJobId(input.jobId);
      return mergeItemDetailsIntoWallProducts(wallRows, items);
    }),
    deleteByJobId: protectedProcedure.input(z.object({ jobId: z.number() })).mutation(async ({ input, ctx }) => {
      await assertOwnsJob(input.jobId, ctx.user.id);
      if (await isPreviewMode()) {
        loadPreviewStore();
        for (let i = previewWalls.length - 1; i >= 0; i--) if (previewWalls[i].jobId === input.jobId) previewWalls.splice(i, 1);
        persistPreviewStore();
        return true;
      }
      return db.deleteWallsByJobId(input.jobId);
    }),
    update: protectedProcedure.input(z.object({ id: z.number(), wallType: z.enum(["regular", "garage", "custom"]).optional(), wallName: z.string().optional(), wallWidthMm: z.number().int().positive().optional(), wallHeightMm: z.number().int().positive().optional(), notes: z.string().optional() })).mutation(async ({ input, ctx }) => {
      const wall = await assertOwnsWall(input.id, ctx.user.id);
      const { id, ...updates } = input;
      if (await isPreviewMode()) {
        Object.assign(wall, updates, { updatedAt: now() });
        persistPreviewStore();
        return wall;
      }
      return db.updateWall(id, updates);
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      await assertOwnsWall(input.id, ctx.user.id);
      if (await isPreviewMode()) {
        loadPreviewStore();
        for (let i = previewJobItems.length - 1; i >= 0; i--) if (previewJobItems[i].wallId === input.id) previewJobItems.splice(i, 1);
        const index = previewWalls.findIndex(wall => wall.id === input.id);
        if (index >= 0) previewWalls.splice(index, 1);
        persistPreviewStore();
        return true;
      }
      return db.deleteWall(input.id);
    }),
  }),
});

export type AppRouter = typeof appRouter;
