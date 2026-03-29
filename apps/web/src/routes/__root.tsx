import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import type { ConvexQueryClient } from "@convex-dev/react-query";
import type { QueryClient } from "@tanstack/react-query";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouteContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { createServerFn } from "@tanstack/react-start";
import { Toasty } from "@cloudflare/kumo";
import { useEffect, useRef } from "react";

import { authClient } from "@/lib/auth-client";
import { getToken } from "@/lib/auth-server";

import Header from "../components/header";

import appCss from "../index.css?url";

const getAuth = createServerFn({ method: "GET" }).handler(async () => {
  return await getToken();
});

export interface RouterAppContext {
  queryClient: QueryClient;
  convexQueryClient: ConvexQueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Uncode | Barcode Workbench",
      },
    ],
    links: [
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/favicon.svg",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),

  component: RootDocument,
  beforeLoad: async (ctx) => {
    const token = await getAuth();
    if (token) {
      ctx.context.convexQueryClient.serverHttpClient?.setAuth(token);
    }
    return {
      isAuthenticated: !!token,
      token,
    };
  },
});

/**
 * Automatically signs in users anonymously when there is no active session.
 * This ensures every visitor gets a Better Auth identity so Convex functions
 * always have a `ctx.auth` identity available.  Anonymous runs are kept
 * client-side in sessionStorage; only real (linked) accounts persist to the DB.
 */
function AutoAnonymousSignIn() {
  const { data: session, isPending } = authClient.useSession();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (isPending || session || attemptedRef.current) return;
    attemptedRef.current = true;
    authClient.signIn.anonymous();
  }, [isPending, session]);

  return null;
}

function RootDocument() {
  const context = useRouteContext({ from: Route.id });

  return (
    <ConvexBetterAuthProvider
      client={context.convexQueryClient.convexClient}
      authClient={authClient}
      initialToken={context.token}
    >
      <AutoAnonymousSignIn />
      <html lang="en" data-mode="dark">
        <head>
          <HeadContent />
        </head>
        <body>
          <Toasty>
            <div className="grid h-svh grid-rows-[auto_1fr]">
              <Header />
              <Outlet />
            </div>
          </Toasty>
          <TanStackRouterDevtools position="bottom-left" />
          <Scripts />
        </body>
      </html>
    </ConvexBetterAuthProvider>
  );
}
