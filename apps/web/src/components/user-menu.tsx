import { api } from "@uncode/backend/convex/_generated/api";
import { Button, DropdownMenu } from "@cloudflare/kumo";
import { useQuery } from "convex/react";

import { authClient } from "@/lib/auth-client";

export default function UserMenu() {
  const user = useQuery(api.auth.getCurrentUser);

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger
        render={(props: React.ComponentPropsWithRef<"button">) => (
          <Button variant="ghost" size="sm" {...props}>
            {user?.name}
          </Button>
        )}
      />
      <DropdownMenu.Content>
        <DropdownMenu.Item>{user?.email}</DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item
          variant="danger"
          onClick={() => {
            authClient.signOut({
              fetchOptions: {
                onSuccess: () => {
                  location.reload();
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
