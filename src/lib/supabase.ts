import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";

interface RuntimeEnv {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

// Em produção, o container gera /config.js na inicialização (window.__ENV__)
// a partir das variáveis de ambiente. Em dev, cai no .env.local do Vite.
const runtime: RuntimeEnv =
  (window as unknown as { __ENV__?: RuntimeEnv }).__ENV__ ?? {};

const url = runtime.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const anonKey = runtime.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (Easypanel: variáveis de ambiente do serviço; local: .env.local)."
  );
}

export const supabase = createClient<Database>(url, anonKey);

// Usados para chamar Edge Functions direto via fetch (streaming da IA).
export const supabaseUrl = url;
export const supabaseAnonKey = anonKey;
