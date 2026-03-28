import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Auth } from "../components/Auth";
import { trpc } from "../router";

export const Route = createFileRoute("/signup")({
  component: SignupComp,
});

function SignupComp() {
  const navigate = useNavigate();
  const signupMutation = trpc.auth.signup.useMutation({
    onSuccess: () => {
      navigate({ to: "/" });
    },
  });

  return (
    <Auth
      actionText="Sign Up"
      status={signupMutation.status}
      onSubmit={(e) => {
        const formData = new FormData(e.target as HTMLFormElement);

        signupMutation.mutate({
          email: formData.get("email") as string,
          password: formData.get("password") as string,
        });
      }}
      afterSubmit={
        signupMutation.error ? (
          <>
            <div className="text-red-400">{signupMutation.error.message}</div>
          </>
        ) : null
      }
    />
  );
}
