import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

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
        clientName: z.string().min(1),
        clientEmail: z.string().email().optional(),
        clientPhone: z.string().optional(),
        clientAddress: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(({ input, ctx }) =>
        db.createJob({
          userId: ctx.user.id,
          clientName: input.clientName,
          clientEmail: input.clientEmail,
          clientPhone: input.clientPhone,
          clientAddress: input.clientAddress,
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
        notes: z.string().optional(),
        totalEstimate: z.number().int().nonnegative().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const job = await db.getJobById(input.id);
        if (job && job.userId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }
        const { id, ...updates } = input;
        return db.updateJob(id, updates);
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
});

export type AppRouter = typeof appRouter;
