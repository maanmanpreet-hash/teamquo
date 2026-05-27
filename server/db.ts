import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, claddingVariants, jobs, jobItems, CladdingVariant, Job, JobItem, InsertCladdingVariant, InsertJob, InsertJobItem } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// CLADDING VARIANTS QUERIES
// ============================================================================

export async function getAllCladdingVariants() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get cladding variants: database not available");
    return [];
  }

  try {
    return await db.select().from(claddingVariants).where(eq(claddingVariants.isActive, 1));
  } catch (error) {
    console.error("[Database] Failed to get cladding variants:", error);
    throw error;
  }
}

export async function getCladdingVariantById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get cladding variant: database not available");
    return undefined;
  }

  try {
    const result = await db.select().from(claddingVariants).where(eq(claddingVariants.id, id)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get cladding variant:", error);
    throw error;
  }
}

export async function createCladdingVariant(variant: InsertCladdingVariant) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create cladding variant: database not available");
    return undefined;
  }

  try {
    const result = await db.insert(claddingVariants).values(variant);
    const insertedId = (result as any).insertId;
    return await getCladdingVariantById(insertedId);
  } catch (error) {
    console.error("[Database] Failed to create cladding variant:", error);
    throw error;
  }
}

export async function updateCladdingVariant(id: number, updates: Partial<InsertCladdingVariant>) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update cladding variant: database not available");
    return undefined;
  }

  try {
    await db.update(claddingVariants).set(updates).where(eq(claddingVariants.id, id));
    return await getCladdingVariantById(id);
  } catch (error) {
    console.error("[Database] Failed to update cladding variant:", error);
    throw error;
  }
}

export async function deleteCladdingVariant(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete cladding variant: database not available");
    return false;
  }

  try {
    // Soft delete by marking as inactive
    await db.update(claddingVariants).set({ isActive: 0 }).where(eq(claddingVariants.id, id));
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete cladding variant:", error);
    throw error;
  }
}

// ============================================================================
// JOBS QUERIES
// ============================================================================

export async function createJob(job: InsertJob) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create job: database not available");
    return undefined;
  }

  try {
    const result = await db.insert(jobs).values(job);
    const insertedId = (result as any).insertId;
    return await getJobById(insertedId);
  } catch (error) {
    console.error("[Database] Failed to create job:", error);
    throw error;
  }
}

export async function getJobById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get job: database not available");
    return undefined;
  }

  try {
    const result = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get job:", error);
    throw error;
  }
}

export async function getJobsByUserId(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get jobs: database not available");
    return [];
  }

  try {
    return await db.select().from(jobs).where(eq(jobs.userId, userId));
  } catch (error) {
    console.error("[Database] Failed to get jobs:", error);
    throw error;
  }
}

export async function updateJobStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update job: database not available");
    return undefined;
  }

  try {
    await db.update(jobs).set({ status: status as any }).where(eq(jobs.id, id));
    return await getJobById(id);
  } catch (error) {
    console.error("[Database] Failed to update job status:", error);
    throw error;
  }
}

export async function updateJob(id: number, updates: Partial<InsertJob>) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update job: database not available");
    return undefined;
  }

  try {
    await db.update(jobs).set(updates).where(eq(jobs.id, id));
    return await getJobById(id);
  } catch (error) {
    console.error("[Database] Failed to update job:", error);
    throw error;
  }
}

// ============================================================================
// JOB ITEMS QUERIES
// ============================================================================

export async function createJobItem(item: InsertJobItem) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create job item: database not available");
    return undefined;
  }

  try {
    const result = await db.insert(jobItems).values(item);
    const insertedId = (result as any).insertId;
    const createdItem = await db.select().from(jobItems).where(eq(jobItems.id, insertedId)).limit(1);
    return createdItem.length > 0 ? createdItem[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to create job item:", error);
    throw error;
  }
}

export async function getJobItemsByJobId(jobId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get job items: database not available");
    return [];
  }

  try {
    return await db.select().from(jobItems).where(eq(jobItems.jobId, jobId));
  } catch (error) {
    console.error("[Database] Failed to get job items:", error);
    throw error;
  }
}

export async function updateJobItem(id: number, updates: Partial<InsertJobItem>) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update job item: database not available");
    return undefined;
  }

  try {
    await db.update(jobItems).set(updates).where(eq(jobItems.id, id));
    const result = await db.select().from(jobItems).where(eq(jobItems.id, id)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to update job item:", error);
    throw error;
  }
}

export async function deleteJobItem(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete job item: database not available");
    return false;
  }

  try {
    await db.delete(jobItems).where(eq(jobItems.id, id));
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete job item:", error);
    throw error;
  }
}
