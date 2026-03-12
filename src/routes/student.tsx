import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import type { Profile } from "../types/database.types";

export const Route = createFileRoute("/student")({
  beforeLoad: ({ context }) => {
    const user = context.user as Profile | null;
    console.log("🚀 ~ user:", user);

    if (!user) {
      throw redirect({ to: "/login" });
    }

    if (user.role !== "student") {
      throw redirect({ to: "/" });
    }
  },
  component: StudentLayout,
});

function StudentLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </div>
    </div>
  );
}
