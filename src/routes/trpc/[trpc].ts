import { createFileRoute } from "@tanstack/react-router";
import { createAPIFileRoute } from "@tanstack/start/api";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../../server/trpc/router";
import { createContext } from "../../server/trpc/context";

export const Route = createAPIFileRoute("/trpc/trpc")({
  GET: async ({ request }) => {
    return fetchRequestHandler({
      endpoint: "/trpc",
      req: request,
      router: appRouter,
      createContext,
    });
  },
  POST: async ({ request }) => {
    return fetchRequestHandler({
      endpoint: "/trpc",
      req: request,
      router: appRouter,
      createContext,
    });
  },
});
