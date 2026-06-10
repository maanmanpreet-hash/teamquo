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
import { eq } from "drizzle-orm";
import * as db from "./db";
import { generateQuoteHTML } from "./pdf";
import { formatQuoteNumber } from "../shared/quote";
import { jobs as jobsTable } from "../drizzle/schema";

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
] as const;

const now = () => new Date();
const isPreviewMode = async () => !(await db.getDb());

const previewProductTypes: any[] = [
  { id: 1, name: "Cladding", slug: "cladding", description: "Wall cladding panels", isActive: 1, createdAt: now(), updatedAt: now() },
  { id: 2, name: "Acoustic Panels", slug: "acoustic-panels", description: "Sound-absorbing acoustic panels", isActive: 1, createdAt: now(), updatedAt: now() },
  { id: 3, name: "UV Panel (Marble Sheet)", slug: "marble-sheet", description: "PVC marble sheet panels", isActive: 1, createdAt: now(), updatedAt: now() },
  { id: 4, name: "Mirrors", slug: "mirrors", description: "Designer LED mirrors", isActive: 1, createdAt: now(), updatedAt: now() },
  { id: 5, name: "Fireplace", slug: "fireplace", description: "Designer fireplaces", isActive: 1, createdAt: now(), updatedAt: now() },
  { id: 6, name: "Floating Cabinets", slug: "floating-cabinets", description: "Custom floating cabinets", isActive: 1, createdAt: now(), updatedAt: now() },
  { id: 7, name: "TV Backdrop", slug: "tv-backdrop", description: "PVC/MDF TV backdrop allowance", isActive: 1, createdAt: now(), updatedAt: now() },
  { id: 8, name: "Side Towers", slug: "side-towers", description: "Custom side towers", isActive: 1, createdAt: now(), updatedAt: now() },
  { id: 9, name: "Shelving", slug: "shelving", description: "Custom shelving", isActive: 1, createdAt: now(), updatedAt: now() },
];

const previewProducts: any[] = [
  { id: 101, productTypeId: 1, name: "Timber Look 300x600", design: "Timber", widthMm: 300, heightMm: 600, depthMm: null, pricePerUnit: 5000, description: "Natural timber look cladding", isActive: 1, createdAt: now(), updatedAt: now() },
  { id: 102, productTypeId: 1, name: "Stone Look 300x600", design: "Stone", widthMm: 300, heightMm: 600, depthMm: null, pricePerUnit: 5500, description: "Stone finish cladding", isActive: 1, createdAt: now(), updatedAt: now() },
  { id: 201, productTypeId: 2, name: "Acoustic Panel Oak", design: "Oak", widthMm: 600, heightMm: 2900, depthMm: 21, pricePerUnit: 7500, description: "Acoustic slat panel in Oak", isActive: 1, createdAt: now(), updatedAt: now() },
  { id: 202, productTypeId: 2, name: "Acoustic Panel Black", design: "Black", widthMm: 600, heightMm: 2900, depthMm: 21, pricePerUnit: 7500, description: "Acoustic slat panel in Black", isActive: 1, createdAt: now(), updatedAt: now() },
  { id: 301, productTypeId: 3, name: "PVC Marble Sheet 1220x2900", design: "Marble", widthMm: 1220, heightMm: 2900, depthMm: 3, pricePerUnit: 8000, description: "PVC marble sheet", isActive: 1, createdAt: now(), updatedAt: now() },
  { id: 401, productTypeId: 4, name: "Full Moon LED Mirror 1200mm", design: "Round", widthMm: 1200, heightMm: 1200, depthMm: null, pricePerUnit: 35000, description: "Frameless 3 colour LED mirror", isActive: 1, createdAt: now(), updatedAt: now() },
  { id: 501, productTypeId: 5, name: "Fireplace 60 inch", design: "Premium", widthMm: null, heightMm: null, depthMm: null, pricePerUnit: 70000, description: "Premium designer fireplace", isActive: 1, createdAt: now(), updatedAt: now() },
  { id: 601, productTypeId: 6, name: "Floating Cabinet - Custom", design: "Melamine", widthMm: null, heightMm: null, depthMm: null, pricePerUnit: 120000, description: "Custom floating cabinet allowance", isActive: 1, createdAt: now(), updatedAt: now() },
  { id: 701, productTypeId: 7, name: "TV Backdrop - Custom", design: "PVC/MDF", widthMm: 1220, heightMm: 2900, depthMm: null, pricePerUnit: 0, description: "TV backdrop dimensions captured for internal material summary. Operator prices manually.", isActive: 1, createdAt: now(), updatedAt: now() },
  { id: 801, productTypeId: 8, name: "Side Tower - Custom", design: "Melamine", widthMm: null, heightMm: null, depthMm: null, pricePerUnit: 0, description: "Custom side tower dimensions only. Operator prices manually.", isActive: 1, createdAt: now(), updatedAt: now() },
  { id: 901, productTypeId: 9, name: "Shelving - Custom", design: "Melamine", widthMm: null, heightMm: null, depthMm: null, pricePerUnit: 0, description: "Custom shelving dimensions only. Operator prices manually.", isActive: 1, createdAt: now(), updatedAt: now() },
];

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

let nextJobId = 9002;
let nextWallId = 8002;
let nextItemId = 7002;

const previewJobs: any[] = [
  {
    id: 9001,
    userId: 1,
    operatorName: "Manpreet",
    clientName: "Example Test Client",
    clientEmail: "test@example.com",
    clientPhone: "0412 345 678",
    clientAddress: "123 Preview Street",
    suburb: "Kalkallo",
    appointmentDate: null,
    appointmentTime: "10:00",
    referenceImageUrl: null,
    status: "quoted",
    stage: "quoting",
    stageStatus: "in_progress",
    totalEstimate: 52500,
    notes: "Local preview example. Safe to delete.",
    createdAt: now(),
    updatedAt: now(),
  },
];

const previewWalls: any[] = [
  {
    id: 8001,
    jobId: 9001,
    wallType: "custom",
    wallName: "Living Room TV Wall",
    wallWidthMm: 3800,
    wallHeightMm: 2600,
    notes: null,
    createdAt: now(),
    updatedAt: now(),
  },
];

const previewJobItems: any[] = [
  {
    id: 7001,
    jobId: 9001,
    wallId: 8001,
    itemType: "acoustic_panel",
    productId: 201,
    claddingVariantId: null,
    wallWidthMm: 3800,
    wallHeightMm: 2600,
    cabinetWidthMm: null,
    cabinetHeightMm: null,
    cabinetDepthMm: null,
    cabinetHeightFromFloorMm: null,
    quantityRequired: 7,
    unitPrice: 7500,
    totalPrice: 52500,
    manualPriceOverride: null,
    createdAt: now(),
    updatedAt: now(),
  },
];

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

async function assertOwnsJob(jobId: number, userId: number) {
  if (await isPreviewMode()) {
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
  clientEmail: z.string().email().optional(),
  clientPhone: z.string().optional(),
  clientAddress: z.string().optional(),
  suburb: z.string().optional(),
  appointmentDate: z.string().optional(),
  appointmentTime: z.string().optional(),
  referenceImageUrl: z.string().optional(),
  operatorName: z.string().optional(),
  totalEstimate: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
});

const jobUpdateSchema = jobInputSchema.extend({ id: z.number() });

function buildJobInput(input: z.infer<typeof jobInputSchema>, userId: number) {
  return {
    userId,
    clientName: input.clientName || "[Draft]",
    clientEmail: input.clientEmail,
    clientPhone: input.clientPhone,
    clientAddress: input.clientAddress,
    suburb: input.suburb,
    appointmentDate: input.appointmentDate ? new Date(input.appointmentDate) : null,
    appointmentTime: input.appointmentTime,
    referenceImageUrl: input.referenceImageUrl,
    operatorName: input.operatorName,
    totalEstimate: input.totalEstimate,
    notes: input.notes,
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
    create: protectedProcedure
      .input(z.object({ name: z.string().min(1), design: z.string().min(1), widthMm: z.number().int().positive(), heightMm: z.number().int().positive(), pricePerUnit: z.number().int().nonnegative(), description: z.string().optional() }))
      .mutation(async ({ input }) => {
        if (await isPreviewMode()) return undefined;
        return db.createCladdingVariant({ ...input, isActive: 1 });
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), design: z.string().optional(), widthMm: z.number().int().positive().optional(), heightMm: z.number().int().positive().optional(), pricePerUnit: z.number().int().nonnegative().optional(), description: z.string().optional() }))
      .mutation(async ({ input }) => {
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
      if (await isPreviewMode()) return previewJobs.filter(job => job.userId === ctx.user.id);
      return db.getJobsByUserId(ctx.user.id);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
      if (await isPreviewMode()) {
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
        const job = { id: nextJobId++, ...buildJobInput(input, ctx.user.id), stage: "quoting", stageStatus: "in_progress", createdAt: now(), updatedAt: now() };
        previewJobs.unshift(job);
        return job;
      }
      return db.createJob(buildJobInput(input, ctx.user.id));
    }),
    updateStatus: protectedProcedure.input(z.object({ id: z.number(), status: z.enum(["quoted", "booked", "commenced", "completed", "cancelled"]) })).mutation(async ({ input, ctx }) => {
      const job = await assertOwnsJob(input.id, ctx.user.id);
      if (await isPreviewMode()) {
        Object.assign(job, { status: input.status, updatedAt: now() });
        return job;
      }
      return db.updateJobStatus(input.id, input.status);
    }),
    update: protectedProcedure.input(jobUpdateSchema).mutation(async ({ input, ctx }) => {
      const job = await assertOwnsJob(input.id, ctx.user.id);
      const { id, appointmentDate, ...updates } = input;
      const updateData = { ...updates, appointmentDate: appointmentDate ? new Date(appointmentDate) : undefined };
      if (await isPreviewMode()) {
        Object.assign(job, updateData, { updatedAt: now() });
        return job;
      }
      return db.updateJob(id, updateData);
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      await assertOwnsJob(input.id, ctx.user.id);
      if (await isPreviewMode()) {
        for (let i = previewJobItems.length - 1; i >= 0; i--) if (previewJobItems[i].jobId === input.id) previewJobItems.splice(i, 1);
        for (let i = previewWalls.length - 1; i >= 0; i--) if (previewWalls[i].jobId === input.id) previewWalls.splice(i, 1);
        const index = previewJobs.findIndex(job => job.id === input.id);
        if (index >= 0) previewJobs.splice(index, 1);
        return true;
      }
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");
      await db.deleteJobItemsByJobId(input.id);
      await db.deleteWallsByJobId(input.id);
      await database.delete(jobsTable).where(eq(jobsTable.id, input.id));
      return true;
    }),
  }),

  jobItems: router({
    getByJobId: protectedProcedure.input(z.object({ jobId: z.number() })).query(async ({ input, ctx }) => {
      await assertOwnsJob(input.jobId, ctx.user.id);
      if (await isPreviewMode()) return previewJobItems.filter(item => item.jobId === input.jobId);
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
      const html = generateQuoteHTML(job as any, items as any, variantMap as any, productMap as any, undefined, undefined, wallMap as any);
      return { html, jobId: job.id, clientName: job.clientName, quoteNumber: formatQuoteNumber(job as any) };
    }),
    create: protectedProcedure
      .input(z.object({ jobId: z.number(), itemType: z.enum(supportedItemTypes), productId: z.number().optional(), claddingVariantId: z.number().optional(), wallWidthMm: z.number().int().positive().optional(), wallHeightMm: z.number().int().positive().optional(), cabinetWidthMm: z.number().int().positive().optional(), cabinetHeightMm: z.number().int().positive().optional(), cabinetDepthMm: z.number().int().positive().optional(), cabinetHeightFromFloorMm: z.number().int().nonnegative().optional(), wallId: z.number().optional(), quantityRequired: z.number().int().positive().optional(), unitPrice: z.number().int().nonnegative().optional(), totalPrice: z.number().int().nonnegative().optional(), manualPriceOverride: z.number().int().nonnegative().optional() }))
      .mutation(async ({ input, ctx }) => {
        await assertOwnsJob(input.jobId, ctx.user.id);
        if (input.wallId) {
          const wall = await assertOwnsWall(input.wallId, ctx.user.id);
          if (wall.jobId !== input.jobId) throw new Error("Wall does not belong to this quote");
        }
        const { jobId, ...itemData } = input;
        if (await isPreviewMode()) {
          const item = { id: nextItemId++, jobId, ...itemData, createdAt: now(), updatedAt: now() };
          previewJobItems.push(item);
          return item;
        }
        return db.createJobItem({ jobId, ...itemData });
      }),
    update: protectedProcedure.input(z.object({ id: z.number(), quantityRequired: z.number().int().positive().optional(), totalPrice: z.number().int().nonnegative().optional(), manualPriceOverride: z.number().int().nonnegative().optional() })).mutation(async ({ input, ctx }) => {
      const item = await assertOwnsJobItem(input.id, ctx.user.id);
      const { id, ...updates } = input;
      if (await isPreviewMode()) {
        Object.assign(item, updates, { updatedAt: now() });
        return item;
      }
      return db.updateJobItem(id, updates);
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      await assertOwnsJobItem(input.id, ctx.user.id);
      if (await isPreviewMode()) {
        const index = previewJobItems.findIndex(item => item.id === input.id);
        if (index >= 0) previewJobItems.splice(index, 1);
        return true;
      }
      return db.deleteJobItem(input.id);
    }),
    deleteByJobId: protectedProcedure.input(z.object({ jobId: z.number() })).mutation(async ({ input, ctx }) => {
      await assertOwnsJob(input.jobId, ctx.user.id);
      if (await isPreviewMode()) {
        for (let i = previewJobItems.length - 1; i >= 0; i--) if (previewJobItems[i].jobId === input.jobId) previewJobItems.splice(i, 1);
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
        const product = { id: Math.max(...previewProducts.map(product => product.id)) + 1, ...input, isActive: 1, createdAt: now(), updatedAt: now() };
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
        const wall = { id: nextWallId++, ...input, createdAt: now(), updatedAt: now() };
        previewWalls.push(wall);
        return wall;
      }
      return db.createWall(input);
    }),
    getByJobId: protectedProcedure.input(z.object({ jobId: z.number() })).query(async ({ input, ctx }) => {
      await assertOwnsJob(input.jobId, ctx.user.id);
      if (await isPreviewMode()) return previewGetWallsWithItemsByJobId(input.jobId);
      return db.getWallsWithItemsByJobId(input.jobId);
    }),
    deleteByJobId: protectedProcedure.input(z.object({ jobId: z.number() })).mutation(async ({ input, ctx }) => {
      await assertOwnsJob(input.jobId, ctx.user.id);
      if (await isPreviewMode()) {
        for (let i = previewWalls.length - 1; i >= 0; i--) if (previewWalls[i].jobId === input.jobId) previewWalls.splice(i, 1);
        return true;
      }
      return db.deleteWallsByJobId(input.jobId);
    }),
    update: protectedProcedure.input(z.object({ id: z.number(), wallType: z.enum(["regular", "garage", "custom"]).optional(), wallName: z.string().optional(), wallWidthMm: z.number().int().positive().optional(), wallHeightMm: z.number().int().positive().optional(), notes: z.string().optional() })).mutation(async ({ input, ctx }) => {
      const wall = await assertOwnsWall(input.id, ctx.user.id);
      const { id, ...updates } = input;
      if (await isPreviewMode()) {
        Object.assign(wall, updates, { updatedAt: now() });
        return wall;
      }
      return db.updateWall(id, updates);
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      await assertOwnsWall(input.id, ctx.user.id);
      if (await isPreviewMode()) {
        for (let i = previewJobItems.length - 1; i >= 0; i--) if (previewJobItems[i].wallId === input.id) previewJobItems.splice(i, 1);
        const index = previewWalls.findIndex(wall => wall.id === input.id);
        if (index >= 0) previewWalls.splice(index, 1);
        return true;
      }
      return db.deleteWall(input.id);
    }),
  }),
});

export type AppRouter = typeof appRouter;
