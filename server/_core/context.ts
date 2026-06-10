import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { ENV } from "./env";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

const localDevUser = {
  id: 1,
  openId: "local-dev-user",
  name: "Local Preview",
  email: "local@skywall.test",
  loginMethod: "local",
  role: "admin",
  lastSignedIn: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
} as User;

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  if (process.env.NODE_ENV === "development" && !ENV.oAuthServerUrl) {
    user = localDevUser;
  } else {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch (error) {
      // Authentication is optional for public procedures.
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
