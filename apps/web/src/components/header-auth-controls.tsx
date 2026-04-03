import { Link } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

import UserMenu from "./user-menu";

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

export default function HeaderAuthControls() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <SignInLink />;
  }

  if (session?.user) {
    return <UserMenu user={session.user} />;
  }

  return <SignInLink />;
}
