import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  throw new Error(
    "Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local (veja .env.example)."
  );
}

export const supabase = createClient<Database>(url, anonKey);
