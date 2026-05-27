import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { generateQuoteHTML } from "./pdf";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  cladding: router({
    list: publicProcedure.query(() => db.getAllCladdingVariants()),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getCladdingVariantById(input.id)),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        design: z.string().min(1),
        widthMm: z.number().int().positive(),
        heightMm: z.number().int().positive(),
        pricePerUnit: z.number().int().nonnegative(),
        description: z.string().optional(),
      }))
      .mutation(({ input }) =>
        db.createCladdingVariant({
          name: input.name,
          design: input.design,
          widthMm: input.widthMm,
          heightMm: input.heightMm,
          pricePerUnit: input.pricePerUnit,
          description: input.description,
          isActive: 1,
        })
      ),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        design: z.string().optional(),
        widthMm: z.number().int().positive().optional(),
        heightMm: z.number().int().positive().optional(),
        pricePerUnit: z.number().int().nonnegative().optional(),
        description: z.string().optional(),
      }))
      .mutation(({ input }) => {
        const { id, ...updates } = input;
        return db.updateCladdingVariant(id, updates);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteCladdingVariant(input.id)),
  }),

  jobs: router({
    list: protectedProcedure.query(({ ctx }) =>
      db.getJobsByUserId(ctx.user.id)
    ),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const job = await db.getJobById(input.id);
        if (job && job.userId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }
        return job;
      }),
    create: protectedProcedure
      .input(z.object({
        clientName: z.string().min(1).optional(),
        clientEmail: z.string().email().optional(),
        clientPhone: z.string().optional(),
        clientAddress: z.string().optional(),
        suburb: z.string().optional(),
        appointmentDate: z.string().optional(), // YYYY-MM-DD format
        appointmentTime: z.string().optional(), // HH:MM format
        referenceImageUrl: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(({ input, ctx }) =>
        db.createJob({
          userId: ctx.user.id,
          clientName: input.clientName || "[Draft]",
          clientEmail: input.clientEmail,
          clientPhone: input.clientPhone,
          clientAddress: input.clientAddress,
          suburb: input.suburb,
          appointmentDate: input.appointmentDate ? new Date(input.appointmentDate) : null,
          appointmentTime: input.appointmentTime,
          referenceImageUrl: input.referenceImageUrl,
          notes: input.notes,
          status: "quoted",
        })
      ),
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["quoted", "booked", "commenced", "completed", "cancelled"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const job = await db.getJobById(input.id);
        if (job && job.userId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }
        return db.updateJobStatus(input.id, input.status);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        clientName: z.string().optional(),
        clientEmail: z.string().email().optional(),
        clientPhone: z.string().optional(),
        clientAddress: z.string().optional(),
        suburb: z.string().optional(),
        appointmentDate: z.string().optional(),
        appointmentTime: z.string().optional(),
        referenceImageUrl: z.string().optional(),
        notes: z.string().optional(),
        totalEstimate: z.number().int().nonnegative().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const job = await db.getJobById(input.id);
        if (job && job.userId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }
        const { id, appointmentDate, ...updates } = input;
        const updateData = {
          ...updates,
          appointmentDate: appointmentDate ? new Date(appointmentDate) : undefined,
        };
        return db.updateJob(id, updateData);
      }),
  }),

  jobItems: router({
    getByJobId: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .query(async ({ input, ctx }) => {
        const job = await db.getJobById(input.jobId);
        if (job && job.userId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }
        return db.getJobItemsByJobId(input.jobId);
      }),
    generatePDF: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .query(async ({ input, ctx }) => {
        const job = await db.getJobById(input.jobId);
        if (!job || job.userId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }
        const items = await db.getJobItemsByJobId(input.jobId);
        const variants = await db.getAllCladdingVariants();
        const variantMap = new Map(variants.map((v) => [v.id, v]));
        const html = generateQuoteHTML(job, items, variantMap);
        return { html, jobId: job.id, clientName: job.clientName };
      }),
    create: protectedProcedure
      .input(z.object({
        jobId: z.number(),
        itemType: z.enum(["cladding", "cabinet"]),
        claddingVariantId: z.number().optional(),
        wallWidthMm: z.number().int().positive().optional(),
        wallHeightMm: z.number().int().positive().optional(),
        cabinetWidthMm: z.number().int().positive().optional(),
        cabinetHeightMm: z.number().int().positive().optional(),
        cabinetDepthMm: z.number().int().positive().optional(),
        quantityRequired: z.number().int().positive().optional(),
        unitPrice: z.number().int().nonnegative().optional(),
        totalPrice: z.number().int().nonnegative().optional(),
        manualPriceOverride: z.number().int().nonnegative().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const job = await db.getJobById(input.jobId);
        if (job && job.userId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }
        const { jobId, ...itemData } = input;
        return db.createJobItem({ jobId, ...itemData });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        quantityRequired: z.number().int().positive().optional(),
        totalPrice: z.number().int().nonnegative().optional(),
        manualPriceOverride: z.number().int().nonnegative().optional(),
      }))
      .mutation(({ input }) => {
        const { id, ...updates } = input;
        return db.updateJobItem(id, updates);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
            .mutation(({ input }) => db.deleteJobItem(input.id)),
  }),

  products: router({
    listTypes: publicProcedure.query(() => db.getAllProductTypes()),
    listByType: publicProcedure
      .input(z.object({ productTypeId: z.number() }))
      .query(({ input }) => db.getAllProducts(input.productTypeId)),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getProductById(input.id)),
    create: protectedProcedure
      .input(z.object({
        productTypeId: z.number(),
        name: z.string().min(1),
        design: z.string().optional(),
        widthMm: z.number().int().positive().optional(),
        heightMm: z.number().int().positive().optional(),
        depthMm: z.number().int().positive().optional(),
        pricePerUnit: z.number().int().nonnegative(),
        description: z.string().optional(),
      }))
      .mutation(({ input }) => db.createProduct(input)),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        design: z.string().optional(),
        widthMm: z.number().int().positive().optional(),
        heightMm: z.number().int().positive().optional(),
        depthMm: z.number().int().positive().optional(),
        pricePerUnit: z.number().int().nonnegative().optional(),
        description: z.string().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(({ input }) => {
        const { id, ...updates } = input;
        return db.updateProduct(id, updates);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteProduct(input.id)),
    getDiscounts: publicProcedure
      .input(z.object({ productTypeId: z.number() }))
      .query(({ input }) => db.getVolumeDiscounts(input.productTypeId)),
        calculateDiscount: publicProcedure
      .input(z.object({ productTypeId: z.number(), quantity: z.number().int().positive() }))
      .query(({ input }) => db.calculateDiscount(input.productTypeId, input.quantity)),
  }),

  operators: router({
    list: publicProcedure.query(() => db.getAllOperators()),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getOperatorById(input.id)),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1, "Operator name is required"),
      }))
      .mutation(({ input }) => db.createOperator({ name: input.name, isActive: 1 })),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(({ input }) => {
        const { id, ...updates } = input;
        return db.updateOperator(id, updates);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteOperator(input.id)),
  }),

  storage: router({
    uploadImage: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        base64Data: z.string(),
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const { storagePut } = await import("./storage");
        
        // Decode base64 to buffer
        const buffer = Buffer.from(input.base64Data, "base64");
        
        // Validate size (5MB limit)
        if (buffer.length > 5 * 1024 * 1024) {
          throw new Error("Image exceeds 5MB limit");
        }
        
        // Upload to storage
        const { url } = await storagePut(
          `reference-images/${ctx.user.id}/${Date.now()}-${input.fileName}`,
          buffer,
          input.mimeType
        );
        
        return { url };
      }),
  }),

  walls: router({
    create: protectedProcedure
      .input(z.object({
        jobId: z.number(),
        wallType: z.enum(["regular", "garage", "custom"]).default("regular"),
        wallName: z.string().optional(),
        wallWidthMm: z.number().int().positive().optional(),
        wallHeightMm: z.number().int().positive().optional(),
        notes: z.string().optional(),
      }))
      .mutation(({ input, ctx }) => {
        return db.createWall({
          jobId: input.jobId,
          wallType: input.wallType,
          wallName: input.wallName,
          wallWidthMm: input.wallWidthMm,
          wallHeightMm: input.wallHeightMm,
          notes: input.notes,
        });
      }),
    getByJobId: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .query(({ input }) => db.getWallsByJobId(input.jobId)),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        wallType: z.enum(["regular", "garage", "custom"]).optional(),
        wallName: z.string().optional(),
        wallWidthMm: z.number().int().positive().optional(),
        wallHeightMm: z.number().int().positive().optional(),
        notes: z.string().optional(),
      }))
      .mutation(({ input }) => {
        const { id, ...updates } = input;
        return db.updateWall(id, updates);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteWall(input.id)),
  }),
});
export type AppRouter = typeof appRouter;
