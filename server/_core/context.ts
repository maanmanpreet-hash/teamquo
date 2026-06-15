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
  email: "local@skywallcabinets.test",
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
  // Local development auth bypass: when LOCAL_DEV_AUTH=true and not in production,
  // short-circuit authentication and return a fixed local dev user. This is
  // strictly for developer convenience and does not alter production behavior.
  if (!ENV.isProduction && ENV.localDevAuth) {
    console.log('[Auth] LOCAL_DEV_AUTH enabled');
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
