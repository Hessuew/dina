import { useRouter } from "@tanstack/react-router";
import { trpc } from "../router";
import { Auth } from "./Auth";

export function Login() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await router.invalidate();
      console.log("🚀 ~ Login ~ onSuccess");

      // Fetch user to determine role-based redirect
      const user = await utils.auth.getCurrentUser.fetch();
      console.log("🚀 ~ Login ~ user:", user);

      if (user?.role === "admin") {
        router.navigate({ to: "/admin/dashboard" });
      } else if (user?.role === "teacher") {
        router.navigate({ to: "/teacher/dashboard" });
      } else if (user?.role === "student") {
        router.navigate({ to: "/student/dashboard" });
      } else {
        router.navigate({ to: "/" });
      }
    },
  });

  const signupMutation = trpc.auth.signup.useMutation({
    onSuccess: async () => {
      await router.invalidate();

      // New users default to student role, redirect to student dashboard
      router.navigate({ to: "/student/dashboard" });
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
