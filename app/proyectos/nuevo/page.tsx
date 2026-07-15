"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { crearProyecto } from "@/lib/crear-proyecto-client";
import { NavBar } from "@/components/NavBar";

export default function NuevoProyectoPage() {
  const router = useRouter();
  const supabase = createClient();

  const [codigo, setCodigo] = useState("");
  const [agricultor, setAgricultor] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (!usuario) {
      setError("No se pudo identificar tu usuario");
      setEnviando(false);
      return;
    }

    const resultado = await crearProyecto(supabase, codigo, agricultor, usuario.id);

    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.error ?? "No se pudo crear el proyecto");
      return;
    }

    router.push(`/mis-tareas/${resultado.proyectoId}`);
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="p-5 max-w-md mx-auto">
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border p-4"
          style={{ borderColor: "var(--border-default)", background: "var(--surface-card)" }}
        >
          <p className="font-medium text-base mb-1">Crear nuevo proyecto</p>
          <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
            Solo se piden estos 2 datos ahora. El resto se completa en la etapa 3, con el
            formulario de ingreso. El código y el nombre del agricultor no se podrán modificar
            después.
          </p>

          <label className="text-xs block mb-1" style={{ color: "var(--text-secondary)" }}>
            Código proyecto
          </label>
          <input
            required
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            className="w-full h-9 px-2 mb-3 rounded-md border text-sm"
            style={{ borderColor: "var(--border-default)" }}
          />

          <label className="text-xs block mb-1" style={{ color: "var(--text-secondary)" }}>
            Nombre agricultor
          </label>
          <input
            required
            value={agricultor}
            onChange={(e) => setAgricultor(e.target.value)}
            className="w-full h-9 px-2 mb-4 rounded-md border text-sm"
            style={{ borderColor: "var(--border-default)" }}
          />

          {error && (
            <p className="text-xs mb-3" style={{ color: "var(--status-overdue-text)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full h-10 rounded-lg text-sm font-medium text-white"
            style={{ background: "#3B82F6", opacity: enviando ? 0.6 : 1 }}
          >
            {enviando ? "Creando..." : "Crear proyecto"}
          </button>
        </form>
      </main>
    </div>
  );
}
