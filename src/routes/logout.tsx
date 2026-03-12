import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { trpc } from "../router";
import { useEffect } from "react";

export const Route = createFileRoute("/logout")({
  component: LogoutComponent,
});

function LogoutComponent() {
  const navigate = useNavigate();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      navigate({ to: "/" });
    },
  });

  useEffect(() => {
    logoutMutation.mutate();
  }, []);

  return <div className="p-8">Logging out...</div>;
}
