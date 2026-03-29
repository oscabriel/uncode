import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start";
import { env } from "@uncode/env/web";

export const { handler, getToken, fetchAuthQuery, fetchAuthMutation, fetchAuthAction } =
  convexBetterAuthReactStart({
    convexUrl: env.VITE_CONVEX_URL,
    convexSiteUrl: env.VITE_CONVEX_SITE_URL,
    jwtCache: {
      enabled: true,
      isAuthError: (error: unknown) =>
        error instanceof Error &&
        (error.message.includes("Unauthenticated") || error.message.includes("token")),
    },
  });
