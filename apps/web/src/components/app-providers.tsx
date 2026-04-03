import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { Toasty } from "@cloudflare/kumo";
import type { ConvexReactClient } from "convex/react";
import { useEffect, useRef } from "react";

import { authClient } from "@/lib/auth-client";

type AppProvidersProps = {
  client: ConvexReactClient;
  enableAnonymousSession: boolean;
  children: React.ReactNode;
};

function AutoAnonymousSignIn({ enabled }: { enabled: boolean }) {
  const { data: session, isPending } = authClient.useSession();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!enabled || isPending || session || attemptedRef.current) return;
    attemptedRef.current = true;
    authClient.signIn.anonymous();
  }, [enabled, isPending, session]);

  return null;
}

export default function AppProviders({
  client,
  enableAnonymousSession,
  children,
}: AppProvidersProps) {
  return (
    <ConvexBetterAuthProvider client={client} authClient={authClient}>
      <AutoAnonymousSignIn enabled={enableAnonymousSession} />
      <Toasty>{children}</Toasty>
    </ConvexBetterAuthProvider>
  );
}
