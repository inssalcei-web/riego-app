"use client";

import { useState } from "react";
import Link from "next/link";

interface ProyectoEncontrado {
  id: string;
  codigo_proyecto: string | null;
  nombre_agricultor: string | null;
}

export default function InformeAgricultorPage() {
  const [rut, setRut] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultados, setResultados] = useState<ProyectoEncontrado[] | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResultados(null);
    setBuscando(true);

    try {
      const res = await fetch(`/api/agricultor/buscar?rut=${encodeURIComponent(rut)}`);
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error ?? "No se pudo buscar el proyecto");
        return;
      }

      setResultados(data.proyectos);
    } catch {
      setError("No se pudo conectar. Intenta de nuevo.");
    } finally {
      setBuscando(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div
        className="w-full max-w-sm rounded-xl border p-7"
        style={{ borderColor: "var(--border-default)", background: "var(--surface-card)" }}
      >
        <div className="flex flex-col items-center gap-1 mb-6">
          <img src="/logo.png" alt="INSSAL" className="h-14 mb-1" />
          <p className="text-sm text-center" style={{ color: "var(--text-secondary)" }}>
            Revisa el estado de tu proyecto de riego
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="text-sm block mb-1" style={{ color: "var(--text-secondary)" }}>
            RUT del agricultor
          </label>
          <input
            required
            value={rut}
            onChange={(e) => setRut(e.target.value)}
            placeholder="12.345.678-9"
            className="w-full h-9 px-3 mb-3 rounded-md border text-base"
            style={{ borderColor: "var(--border-default)" }}
          />

          {error && (
            <p className="text-sm mb-3" style={{ color: "var(--status-overdue-text)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={buscando}
            className="w-full h-9 rounded-md text-base font-medium text-white"
            style={{ background: "#3B82F6", opacity: buscando ? 0.6 : 1 }}
          >
            {buscando ? "Buscando..." : "Buscar mi proyecto"}
          </button>
        </form>

        {resultados && resultados.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {resultados.length === 1
                ? "Encontramos tu proyecto:"
                : `Encontramos ${resultados.length} proyectos asociados a ese RUT:`}
            </p>
            {resultados.map((p) => (
              <a
                key={p.id}
                href={`/api/agricultor/informe-pdf?id=${p.id}&rut=${encodeURIComponent(rut)}`}
                className="flex flex-col px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: "var(--border-default)", background: "var(--surface-page)" }}
              >
                <span className="font-medium">{p.codigo_proyecto ?? "Sin código"}</span>
                <span style={{ color: "var(--text-secondary)" }}>{p.nombre_agricultor ?? "—"}</span>
                <span className="mt-1" style={{ color: "#3B82F6" }}>⬇ Descargar informe PDF</span>
              </a>
            ))}
          </div>
        )}

        <Link
          href="/login"
          className="block text-center text-sm mt-5"
          style={{ color: "var(--text-secondary)" }}
        >
          ← Volver
        </Link>
      </div>
    </main>
  );
}
