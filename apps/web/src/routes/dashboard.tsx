import { createFileRoute } from "@tanstack/react-router";
import { api } from "@uncode/backend/convex/_generated/api";
import { Button } from "@cloudflare/kumo";
import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";
import { useState } from "react";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Uncode | Account" }],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const [showSignIn, setShowSignIn] = useState(false);

  return (
    <>
      <Authenticated>
        <AccountView />
      </Authenticated>
      <Unauthenticated>
        {showSignIn ? (
          <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
        ) : (
          <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
        )}
      </Unauthenticated>
      <AuthLoading>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-kumo-subtle">Loading...</p>
        </div>
      </AuthLoading>
    </>
  );
}

function AccountView() {
  const user = useQuery(api.auth.getCurrentUser);

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
                      onSuccess: () => location.reload(),
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
