import { date, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Product types table: stores different product categories (cladding, acoustic, marble, mirrors, fireplace)
 */
export const productTypes = mysqlTable("product_types", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // e.g., "Cladding", "Acoustic Panels", "Mirrors"
  slug: varchar("slug", { length: 100 }).notNull().unique(), // e.g., "cladding", "acoustic-panels"
  description: text("description"),
  isActive: int("is_active").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductType = typeof productTypes.$inferSelect;
export type InsertProductType = typeof productTypes.$inferInsert;

/**
 * Products table: stores product variants with dimensions and pricing
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  productTypeId: int("product_type_id").notNull(), // Reference to product type
  name: varchar("name", { length: 255 }).notNull(), // e.g., "Timber Look 300x600"
  design: varchar("design", { length: 255 }), // e.g., "Timber", "Stone", "Modern"
  widthMm: int("width_mm"), // Width in millimeters (nullable for products without width)
  heightMm: int("height_mm"), // Height in millimeters (nullable for products without height)
  depthMm: int("depth_mm"), // Depth in millimeters (nullable)
  pricePerUnit: int("price_per_unit").notNull(), // Price in cents
  description: text("description"),
  isActive: int("is_active").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Volume discounts table: stores discount tiers based on quantity
 */
export const volumeDiscounts = mysqlTable("volume_discounts", {
  id: int("id").autoincrement().primaryKey(),
  productTypeId: int("product_type_id").notNull(), // Reference to product type
  minQuantity: int("min_quantity").notNull(), // Minimum quantity for this discount
  discountPercent: int("discount_percent").notNull(), // Discount percentage (e.g., 10 = 10%)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VolumeDiscount = typeof volumeDiscounts.$inferSelect;
export type InsertVolumeDiscount = typeof volumeDiscounts.$inferInsert;

/**
 * Cladding variants table: stores available cladding options with dimensions and pricing (deprecated, kept for backward compatibility)
 */
export const claddingVariants = mysqlTable("cladding_variants", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // e.g., "Timber Look 300x600"
  design: varchar("design", { length: 255 }).notNull(), // e.g., "Timber", "Stone", "Modern"
  widthMm: int("width_mm").notNull(), // Panel width in millimeters
  heightMm: int("height_mm").notNull(), // Panel height in millimeters
  pricePerUnit: int("price_per_unit").notNull(), // Price in cents (e.g., 5000 = $50.00)
  description: text("description"), // Optional description
  isActive: int("is_active").default(1).notNull(), // 1 = active, 0 = inactive
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CladdingVariant = typeof claddingVariants.$inferSelect;
export type InsertCladdingVariant = typeof claddingVariants.$inferInsert;

/**
 * Jobs table: stores job/quote records with client information and status
 */
export const jobs = mysqlTable("jobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  operatorName: varchar("operator_name", { length: 255 }),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  clientEmail: varchar("client_email", { length: 320 }),
  clientPhone: varchar("client_phone", { length: 20 }),
  clientAddress: text("client_address"),
  suburb: varchar("suburb", { length: 100 }), // Suburb for location-based queue sorting
  appointmentDate: date("appointment_date"), // Date agreed to provide quote
  appointmentTime: varchar("appointment_time", { length: 5 }), // Time in HH:MM format
  referenceImageUrl: text("reference_image_url"), // URL to reference image from site visit
  status: mysqlEnum("status", ["quoted", "booked", "commenced", "completed", "cancelled"]).default("quoted").notNull(),
  stage: mysqlEnum("stage", ["quoting", "procurement", "installation", "invoicing"]).default("quoting").notNull(),
  stageStatus: varchar("stage_status", { length: 100 }).default("in_progress"),
  totalEstimate: int("total_estimate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;

/**
 * Job items table: stores individual items (cladding, cabinets) for each job
 */
export const jobItems = mysqlTable("job_items", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("job_id").notNull(), // Reference to the job
  itemType: mysqlEnum("item_type", ["cladding", "cabinet"]).notNull(),
  claddingVariantId: int("cladding_variant_id"), // Reference to cladding variant (if itemType = 'cladding')
  wallWidthMm: int("wall_width_mm"), // Wall width in millimeters
  wallHeightMm: int("wall_height_mm"), // Wall height in millimeters
  cabinetWidthMm: int("cabinet_width_mm"), // Cabinet width (if itemType = 'cabinet')
  cabinetHeightMm: int("cabinet_height_mm"), // Cabinet height (if itemType = 'cabinet')
  cabinetDepthMm: int("cabinet_depth_mm"), // Cabinet depth (if itemType = 'cabinet')
  quantityRequired: int("quantity_required"), // Number of panels/units required
  unitPrice: int("unit_price"), // Price per unit in cents
  totalPrice: int("total_price"), // Total price for this item in cents
  manualPriceOverride: int("manual_price_override"), // Manual override price in cents (if user entered custom price)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type JobItem = typeof jobItems.$inferSelect;
export type InsertJobItem = typeof jobItems.$inferInsert;

/**
 * Operators table: stores field service operators/technicians
 */
export const operators = mysqlTable("operators", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  isActive: int("is_active").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Operator = typeof operators.$inferSelect;
export type InsertOperator = typeof operators.$inferInsert;

/**
 * Stage transitions table: logs when jobs move between stages
 */
export const stageTransitions = mysqlTable("stage_transitions", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("job_id").notNull(),
  fromStage: mysqlEnum("from_stage", ["quoting", "procurement", "installation", "invoicing"]),
  toStage: mysqlEnum("to_stage", ["quoting", "procurement", "installation", "invoicing"]).notNull(),
  transitionedBy: int("transitioned_by"), // User ID who made the transition
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StageTransition = typeof stageTransitions.$inferSelect;
export type InsertStageTransition = typeof stageTransitions.$inferInsert;