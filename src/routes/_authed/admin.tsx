import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { trpc } from "../../router";
import { useEffect } from "react";

export const Route = createFileRoute("/_authed/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const { data: user, isLoading } = trpc.auth.getCurrentUser.useQuery();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate({ to: "/login" });
    } else if (!isLoading && user && user.role !== "admin") {
      navigate({ to: "/" });
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </div>
    </div>
  );
}
