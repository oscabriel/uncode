import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { Button, Input, useKumoToastManager } from "@cloudflare/kumo";
import z from "zod";

import { authClient } from "@/lib/auth-client";

export default function SignInForm({ onSwitchToSignUp }: { onSwitchToSignUp: () => void }) {
  const navigate = useNavigate({ from: "/" });
  const toasts = useKumoToastManager();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        {
          email: value.email,
          password: value.password,
        },
        {
          onSuccess: () => {
            navigate({ to: "/dashboard" });
            toasts.add({ title: "Signed in", variant: "success" });
          },
          onError: (error) => {
            toasts.add({
              title: error.error.message || error.error.statusText,
              variant: "error",
            });
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Invalid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    },
  });

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-kumo-line bg-kumo-elevated p-8">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Welcome back</h1>
          <p className="mt-1 text-sm text-kumo-subtle">Sign in to your account</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field name="email">
            {(field) => (
              <Input
                label="Email"
                id={field.name}
                name={field.name}
                type="email"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.handleChange(e.target.value)}
                error={field.state.meta.errors[0]?.message}
              />
            )}
          </form.Field>

          <form.Field name="password">
            {(field) => (
              <Input
                label="Password"
                id={field.name}
                name={field.name}
                type="password"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.handleChange(e.target.value)}
                error={field.state.meta.errors[0]?.message}
              />
            )}
          </form.Field>

          <form.Subscribe
            selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}
          >
            {({ canSubmit, isSubmitting }) => (
              <Button variant="secondary" type="submit" className="w-full" disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? "Signing in..." : "Sign in"}
              </Button>
            )}
          </form.Subscribe>
        </form>

        <p className="text-center text-sm text-kumo-subtle">
          Don&apos;t have an account?{" "}
          <button type="button" onClick={onSwitchToSignUp} className="text-kumo-link hover:underline">
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}
