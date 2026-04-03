import { Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const HeaderAuthControls = lazy(() => import("./header-auth-controls"));

function SignInLink() {
  return (
    <Link
      to="/signin"
      className="rounded-md px-3 py-1.5 text-[13px] font-medium text-kumo-subtle transition-colors hover:text-kumo-default [&.active]:text-kumo-default"
    >
      Sign in
    </Link>
  );
}

export default function Header() {
  return (
    <header>
      <div className="mx-auto grid w-full max-w-3xl grid-cols-[1fr_auto_1fr] items-center px-6 py-3">
        <div />

        <nav className="flex items-center gap-1">
          <Link
            to="/"
            className="rounded-md px-3 py-1.5 text-[13px] font-medium text-kumo-subtle transition-colors hover:text-kumo-default [&.active]:text-kumo-default"
          >
            Home
          </Link>
          <Link
            to="/workbench"
            search={{ text: undefined, tab: "encode" }}
            className="rounded-md px-3 py-1.5 text-[13px] font-medium text-kumo-subtle transition-colors hover:text-kumo-default [&.active]:text-kumo-default"
          >
            Workbench
          </Link>
          <Link
            to="/history"
            className="rounded-md px-3 py-1.5 text-[13px] font-medium text-kumo-subtle transition-colors hover:text-kumo-default [&.active]:text-kumo-default"
          >
            History
          </Link>
        </nav>

        <div className="flex justify-end">
          <Suspense fallback={<SignInLink />}>
            <HeaderAuthControls />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
