import netlify from "@netlify/vite-plugin-tanstack-start";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import type { PluginOption } from "vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: true,
        autoStaticPathsDiscovery: false,
        crawlLinks: false,
      },
      pages: [
        {
          path: "/",
          prerender: {
            enabled: true,
            outputPath: "/index.html",
            crawlLinks: false,
          },
        },
      ],
      spa: {
        enabled: true,
        prerender: {
          crawlLinks: false,
          retryCount: 0,
        },
      },
    }),
    viteReact(),
    netlify() as PluginOption,
  ],
  server: {
    port: 3001,
  },
  ssr: {
    noExternal: ["@convex-dev/better-auth"],
  },
});
