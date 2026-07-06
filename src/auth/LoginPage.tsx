import { useState, type FormEvent } from "react";
import { Navigate } from "react-router";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";
import { Button } from "@/components/Button";
import { Field, Input } from "@/components/Field";
import { FullScreenSpinner } from "@/components/Spinner";

export function LoginPage() {
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [busy, setBusy] = useState(false);
  const [signupOk, setSignupOk] = useState(false);

  if (loading) return <FullScreenSpinner />;
  if (session) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        // Sem sessão = projeto exige confirmação por e-mail
        if (!data.session) setSignupOk(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(
        msg.includes("Invalid login credentials") ? "E-mail ou senha incorretos." : msg
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-5xl">🎯</div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">Meus Estudos</h1>
          <p className="mt-1 text-sm text-dim">Plataforma pessoal de concursos</p>
        </div>

        {signupOk ? (
          <div className="rounded-card border border-green/30 bg-green/10 p-5 text-center">
            <p className="text-sm font-semibold text-green">Conta criada! 📬</p>
            <p className="mt-2 text-xs leading-relaxed text-dim">
              Enviamos um link de confirmação para <strong>{email}</strong>. Clique nele e depois
              volte aqui para entrar.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => {
                setSignupOk(false);
                setMode("login");
              }}
            >
              Voltar para o login
            </Button>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="space-y-4 rounded-card border border-line/60 bg-navy-800/80 p-6"
          >
            <Field label="E-mail">
              <Input
                type="email"
                required
                autoComplete="email"
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Senha">
              <Input
                type="password"
                required
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </Field>
            <Button type="submit" className="w-full" loading={busy}>
              {mode === "login" ? "Entrar" : "Criar conta"}
            </Button>
            <button
              type="button"
              className="w-full cursor-pointer text-center text-xs text-mut transition-colors hover:text-dim"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login" ? "Primeiro acesso? Criar conta" : "Já tem conta? Entrar"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
