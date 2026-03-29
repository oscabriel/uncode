import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { api } from "@uncode/backend/convex/_generated/api";
import { Button } from "@cloudflare/kumo";
import { useQuery } from "convex/react";
import { useState } from "react";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/signin")({
  head: () => ({
    meta: [{ title: "Uncode | Account" }],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const [showSignIn, setShowSignIn] = useState(true);
  const currentUser = useQuery(api.auth.getCurrentUser);

  // Still loading — getCurrentUser returns `undefined` while the query is in flight.
  if (currentUser === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-kumo-subtle">Loading...</p>
      </div>
    );
  }

  // Real (non-anonymous) authenticated user — show account view.
  if (currentUser && !currentUser.isAnonymous) {
    return <AccountView />;
  }

  // No user or anonymous user — show sign-in / sign-up forms so they can
  // create a real account (Better Auth will automatically link the anonymous
  // session to the new account via the onLinkAccount callback).
  return showSignIn ? (
    <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
  ) : (
    <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
  );
}

function AccountView() {
  const user = useQuery(api.auth.getCurrentUser);
  const navigate = useNavigate();

  return (
    <main className="min-h-0 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Account</h1>

        <div className="rounded-lg border border-kumo-line bg-kumo-elevated p-5">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-kumo-subtle">Name</p>
              <p className="mt-0.5 text-sm">{user?.name ?? "\u2014"}</p>
            </div>
            <div>
              <p className="text-xs text-kumo-subtle">Email</p>
              <p className="mt-0.5 text-sm">{user?.email ?? "\u2014"}</p>
            </div>
            <div className="pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  authClient.signOut({
                    fetchOptions: {
                      onSuccess: () => navigate({ to: "/" }),
                    },
                  })
                }
              >
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
