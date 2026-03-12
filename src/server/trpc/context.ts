import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { db } from "../../db";
import { getSupabaseServerClient } from "../../utils/supabase";

export async function createContext(opts: FetchCreateContextFnOptions) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    db,
    user,
    supabase,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
