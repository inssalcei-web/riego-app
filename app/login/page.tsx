"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setCargando(false);

    if (error) {
      setError("Correo o contraseña incorrectos");
      return;
    }

    router.push("/proyectos");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border p-7"
        style={{ borderColor: "var(--border-default)", background: "var(--surface-card)" }}
      >
        <div className="flex flex-col items-center gap-1 mb-6">
          <img src="/logo.png" alt="INSSAL" className="h-14 mb-1" />
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Seguimiento de proyectos de riego
          </p>
        </div>

        <label className="text-xs block mb-1" style={{ color: "var(--text-secondary)" }}>
          Correo
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nombre@empresa.cl"
          className="w-full h-9 px-3 mb-3 rounded-md border text-sm"
          style={{ borderColor: "var(--border-default)" }}
        />

        <label className="text-xs block mb-1" style={{ color: "var(--text-secondary)" }}>
          Contraseña
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full h-9 px-3 mb-4 rounded-md border text-sm"
          style={{ borderColor: "var(--border-default)" }}
        />

        {error && (
          <p className="text-xs mb-3" style={{ color: "var(--status-overdue-text)" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={cargando}
          className="w-full h-9 rounded-md text-sm font-medium text-white"
          style={{ background: "#3B82F6", opacity: cargando ? 0.6 : 1 }}
        >
          {cargando ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </main>
  );
}
