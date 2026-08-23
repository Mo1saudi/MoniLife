import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { sdk } from "./sdk";
import { getSupabaseManualUserEmail } from "../supabase";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  manualUserEmail?: string | null;
  manualUserId?: number | null;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;
  let manualUserEmail: string | null = null;
  let manualUserId: number | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  try {
    manualUserEmail = await getSupabaseManualUserEmail(opts.req.header("x-omni-manual-token"));
    if (manualUserEmail) {
      const openId = `supabase:${manualUserEmail}`;
      await db.upsertUser({
        openId,
        email: manualUserEmail,
        name: manualUserEmail === "mohamedseo2002@gmail.com" ? "OMNI LIFE Administrator" : null,
        loginMethod: "supabase",
        role: manualUserEmail === "mohamedseo2002@gmail.com" ? "admin" : "user",
        lastSignedIn: new Date(),
      });
      manualUserId = (await db.getUserByOpenId(openId))?.id ?? null;
    }
  } catch {
    manualUserEmail = null;
    manualUserId = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    manualUserEmail,
    manualUserId,
  };
}
