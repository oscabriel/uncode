import { Link } from "@tanstack/react-router";
import { api } from "@uncode/backend/convex/_generated/api";
import { buttonVariants } from "@uncode/ui/components/button";
import { cn } from "@uncode/ui/lib/utils";
import { useQuery } from "convex/react";

import UserMenu from "./user-menu";

export default function Header() {
  const user = useQuery(api.auth.getCurrentUser);

  return (
    <header className="border-b border-white/10 bg-black/40 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="grid h-10 w-10 grid-cols-4 gap-[2px] border border-cyan-300/30 bg-cyan-300/10 p-[3px]">
              {Array.from({ length: 12 }, (_, index) => (
                <span
                  key={index}
                  className={cn(
                    "block bg-cyan-200/80",
                    index % 3 === 0 && "bg-cyan-400",
                    index % 5 === 0 && "bg-white",
                  )}
                />
              ))}
            </div>
            <div>
              <p
                className="text-lg leading-none text-white"
                style={{ fontFamily: '"Chakra Petch", sans-serif' }}
              >
                Uncode
              </p>
              <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                Code 128 Workbench
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-4 text-sm text-zinc-400 md:flex">
            <Link to="/" className="transition hover:text-white">
              Workbench
            </Link>
            <Link to="/dashboard" className="transition hover:text-white">
              Account
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-amber-100 md:inline-flex">
            POC
          </span>
          {user === undefined ? null : user ? (
            <UserMenu />
          ) : (
            <Link to="/dashboard" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
