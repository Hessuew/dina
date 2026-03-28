import {
  Link,
  Outlet,
  createRootRouteWithContext,
  useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { QueryClient } from "@tanstack/react-query";
import type { AppRouter } from "../server/trpc";
import { trpc } from "../router";

export interface RouterAppContext {
  trpc: typeof trpc;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <>
      <RootDocument>
        <Outlet />
      </RootDocument>
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const isFetching = useRouterState({ select: (s) => s.isLoading });

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex items-center border-b gap-2">
        <h1 className="text-3xl p-2">Discipler's Institute for Nations</h1>
        <div
          className={`text-3xl duration-300 delay-0 opacity-0 ${
            isFetching ? " duration-1000 opacity-40" : ""
          }`}
        >
          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
        </div>
      </div>
      <div className="flex-1 flex">
        <div className="divide-y w-56">
          <div>
            <Link
              to="/"
              activeOptions={{ exact: true }}
              preload="intent"
              className="block py-2 px-3 text-blue-700"
              activeProps={{ className: "font-bold" }}
            >
              Home
            </Link>
          </div>
        </div>
        <div className="flex-1 border-l border-gray-200">{children}</div>
      </div>
      <TanStackRouterDevtools position="bottom-right" />
    </div>
  );
}
