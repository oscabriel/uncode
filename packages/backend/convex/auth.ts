import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { anonymous } from "better-auth/plugins";

import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { internalQuery, query } from "./_generated/server";
import authConfig from "./auth.config";

const siteUrl = process.env.SITE_URL!;

export const authComponent = createClient<DataModel>(components.betterAuth);

function createAuth(ctx: GenericCtx<DataModel>) {
  return betterAuth({
    baseURL: siteUrl,
    trustedOrigins: [siteUrl],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [
      anonymous({
        onLinkAccount: async (_ctx) => {
          // When an anonymous user signs up, their anonymous record is
          // automatically deleted by Better Auth. No server-side data
          // migration is needed because anonymous barcode runs are only
          // stored in the browser's sessionStorage, not in the database.
          //
          // If you later want to migrate session runs on link, access
          // _ctx.anonymousUser and _ctx.newUser here.
        },
      }),
      convex({
        authConfig,
        jwksRotateOnTokenGenerationError: true,
      }),
    ],
  });
}

export { createAuth };

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;
    const isAnonymous = !!(user as Record<string, unknown>).isAnonymous;
    return { ...user, isAnonymous };
  },
});

/**
 * Internal query used by actions to check if the current authenticated
 * user is an anonymous Better Auth user. Returns true when there is no
 * identity or the user has the `isAnonymous` flag set.
 */
export const isCurrentUserAnonymous = internalQuery({
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return true;
    return !!(user as Record<string, unknown>).isAnonymous;
  },
});
