import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/lists")({
  ssr: false,
  head: () => ({ meta: [{ title: "Uncode | Lists" }] }),
  component: () => <Outlet />,
});
