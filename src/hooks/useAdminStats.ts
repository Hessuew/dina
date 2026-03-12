import { trpc } from "../lib/trpc";

export function useAdminStats() {
  return trpc.admin.getStats.useQuery();
}
