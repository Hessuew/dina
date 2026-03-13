import "../config/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Create postgres client
const connectionString = process.env.DATABASE_URL!;

// For query purposes - Supabase requires SSL
const queryClient = postgres(connectionString);
export const db = drizzle(queryClient, { schema });

// Helper to get letter grade from numeric grade
export function getLetterGrade(numericGrade: number | null): string | null {
  if (numericGrade === null) return null;

  if (numericGrade >= 90) return "A";
  if (numericGrade >= 80) return "B";
  if (numericGrade >= 70) return "C";
  if (numericGrade >= 60) return "D";
  return "F";
}

// Export schema for use in queries
export * from "./schema";
