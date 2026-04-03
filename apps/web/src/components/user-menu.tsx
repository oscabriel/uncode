import { useNavigate } from "@tanstack/react-router";
import { DropdownMenu } from "@cloudflare/kumo";

import { authClient } from "@/lib/auth-client";

type UserMenuProps = {
  user: {
    name?: string | null;
    email?: string | null;
  };
};

function getFirstName(user: UserMenuProps["user"]) {
  const firstName = user.name?.trim().split(/\s+/)[0];
  return firstName || user.email || "Account";
}

export default function UserMenu({ user }: UserMenuProps) {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger
        render={(props: React.ComponentPropsWithRef<"button">) => (
          <button
            type="button"
            className="rounded-md px-3 py-1.5 text-[13px] font-medium text-kumo-subtle transition-colors hover:text-kumo-default"
            {...props}
          >
            {getFirstName(user)}
          </button>
        )}
      />
      <DropdownMenu.Content>
        <DropdownMenu.Item>{user.email}</DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item
          variant="danger"
          onClick={() => {
            authClient.signOut({
              fetchOptions: {
                onSuccess: () => {
                  navigate({ to: "/" });
                },
              },
            });
          }}
        >
          Sign Out
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}
