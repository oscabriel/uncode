import type { ConvexQueryClient } from "@convex-dev/react-query";
import type { QueryClient } from "@tanstack/react-query";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouteContext,
  useRouterState,
} from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";

import Loader from "@/components/loader";

import Header from "../components/header";

import appCss from "../index.css?url";

const AppProviders = lazy(() => import("../components/app-providers"));

const TanStackRouterDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@tanstack/react-router-devtools").then((m) => ({
        default: m.TanStackRouterDevtools,
      })),
    )
  : () => null;

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
        sizes: "any",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),

  component: RootDocument,
});

function RootDocument() {
  const context = useRouteContext({ from: Route.id });
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [isHydrated, setIsHydrated] = useState(false);
  const [hasActivatedProviders, setHasActivatedProviders] = useState(pathname !== "/");

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (pathname !== "/") {
      setHasActivatedProviders(true);
    }
  }, [pathname]);

  const enableAnonymousSession = pathname !== "/" && pathname !== "/signin";
  const shouldUseProviders = pathname !== "/" || hasActivatedProviders;

  const appShell = (
    <div className="grid h-svh grid-rows-[auto_1fr]">
      <Header />
      <Outlet />
    </div>
  );

  return (
    <html lang="en" data-mode="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {shouldUseProviders ? (
          <Suspense fallback={<Loader />}>
            <AppProviders
              client={context.convexQueryClient.convexClient}
              enableAnonymousSession={enableAnonymousSession}
            >
              {appShell}
            </AppProviders>
          </Suspense>
        ) : pathname === "/" ? (
          appShell
        ) : isHydrated ? (
          <Loader />
        ) : null}
        {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-left" />}
        <Scripts />
      </body>
    </html>
  );
}
