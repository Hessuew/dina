import { trpc } from "../router";

export function useAdminStats() {
  return trpc.admin.getStats.useQuery();
}
