import { useRouter } from "@tanstack/react-router";
import { trpc } from "../router";
import { Auth } from "./Auth";

export function Login() {
  const router = useRouter();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await router.invalidate();
      router.navigate({ to: "/" });
    },
  });

  const signupMutation = trpc.auth.signup.useMutation({
    onSuccess: async () => {
      await router.invalidate();
      router.navigate({ to: "/" });
    },
  });

  return (
    <Auth
      actionText="Login"
      status={loginMutation.status}
      onSubmit={(e) => {
        const formData = new FormData(e.target as HTMLFormElement);

        loginMutation.mutate({
          email: formData.get("email") as string,
          password: formData.get("password") as string,
        });
      }}
      afterSubmit={
        loginMutation.error ? (
          <>
            <div className="text-red-400">{loginMutation.error.message}</div>
            {loginMutation.error.message === "Invalid login credentials" ? (
              <div>
                <button
                  className="text-blue-500"
                  onClick={(e) => {
                    const formData = new FormData(
                      (e.target as HTMLButtonElement).form!,
                    );

                    signupMutation.mutate({
                      email: formData.get("email") as string,
                      password: formData.get("password") as string,
                    });
                  }}
                  type="button"
                >
                  Sign up instead?
                </button>
              </div>
            ) : null}
          </>
        ) : null
      }
    />
  );
}
