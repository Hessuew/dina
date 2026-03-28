import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Request, Response } from "express";

export function getSupabaseServerClient(req: Request, res: Response) {
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return Object.keys(req.cookies || {}).map((name) => ({
            name,
            value: req.cookies[name],
          }));
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options: CookieOptions;
          }>,
        ) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookie(name, value, options);
          });
        },
      },
    },
  );
}
