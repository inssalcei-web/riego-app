"use client";

import { useEffect, useState } from "react";

const ESTILO_INPUT = {
  borderColor: "var(--border-default)",
  background: "var(--surface-card)",
  color: "var(--text-primary)",
} as const;

export function Tarjeta({
  titulo,
  children,
}: {
  titulo?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg p-3 mb-4"
      style={{ background: "var(--surface-card)", boxShadow: "var(--shadow-card)" }}
    >
      {titulo && <p className="text-base font-medium mb-3">{titulo}</p>}
      {children}
    </div>
  );
}

// Número que se confirma al salir del campo (blur) o con Enter.
export function CampoNumero({
  valor,
  onGuardar,
  className = "w-32",
  disabled,
}: {
  valor: number;
  onGuardar: (n: number) => void;
  className?: string;
  disabled?: boolean;
}) {
  const [texto, setTexto] = useState(String(valor));
  useEffect(() => setTexto(String(valor)), [valor]);

  function confirmar() {
    const n = Number(texto);
    if (texto.trim() === "" || !Number.isFinite(n) || n < 0) {
      setTexto(String(valor));
      return;
    }
    if (n !== valor) onGuardar(n);
  }

  return (
    <input
      type="number"
      min={0}
      disabled={disabled}
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className={`h-9 px-2 rounded-md border text-base ${className}`}
      style={ESTILO_INPUT}
    />
  );
}

// Porcentaje mostrado como 15 (=15%), guardado como 0.15.
export function CampoPorcentaje({
  valor,
  onGuardar,
}: {
  valor: number;
  onGuardar: (fraccion: number) => void;
}) {
  const aTexto = (v: number) => String(Math.round(v * 10000) / 100);
  const [texto, setTexto] = useState(aTexto(valor));
  useEffect(() => setTexto(aTexto(valor)), [valor]);

  function confirmar() {
    const n = Number(texto.replace(",", "."));
    if (texto.trim() === "" || !Number.isFinite(n) || n < 0 || n > 100) {
      setTexto(aTexto(valor));
      return;
    }
    const fraccion = Math.round(n * 100) / 10000;
    if (fraccion !== valor) onGuardar(fraccion);
  }

  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="text"
        inputMode="decimal"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="h-9 px-2 w-16 rounded-md border text-base text-right"
        style={ESTILO_INPUT}
      />
      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
        %
      </span>
    </span>
  );
}

export function CampoFecha({
  valor,
  onGuardar,
  className = "w-40",
}: {
  valor: string | null;
  onGuardar: (iso: string) => void;
  className?: string;
}) {
  const [texto, setTexto] = useState(valor ?? "");
  useEffect(() => setTexto(valor ?? ""), [valor]);

  return (
    <input
      type="date"
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={() => {
        if (!texto) setTexto(valor ?? "");
        else if (texto !== valor) onGuardar(texto);
      }}
      className={`h-9 px-2 rounded-md border text-base ${className}`}
      style={ESTILO_INPUT}
    />
  );
}

export function CampoTexto({
  valor,
  onGuardar,
  className = "w-56",
  placeholder,
}: {
  valor: string;
  onGuardar: (t: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [texto, setTexto] = useState(valor);
  useEffect(() => setTexto(valor), [valor]);

  return (
    <input
      type="text"
      value={texto}
      placeholder={placeholder}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={() => texto !== valor && onGuardar(texto)}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className={`h-9 px-2 rounded-md border text-base ${className}`}
      style={ESTILO_INPUT}
    />
  );
}

// Botón de borrar con confirmación en línea (¿Seguro? Sí / No).
export function BotonBorrar({ onConfirmar }: { onConfirmar: () => void }) {
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="text-sm px-2 h-8 rounded-md border"
        style={{ borderColor: "var(--border-default)", color: "var(--status-overdue-text)" }}
      >
        Eliminar
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm whitespace-nowrap">
      ¿Seguro?
      <button
        type="button"
        onClick={() => {
          setConfirmando(false);
          onConfirmar();
        }}
        className="px-2 h-8 rounded-md text-white"
        style={{ background: "var(--status-overdue-text)" }}
      >
        Sí
      </button>
      <button
        type="button"
        onClick={() => setConfirmando(false)}
        className="px-2 h-8 rounded-md border"
        style={{ borderColor: "var(--border-default)" }}
      >
        No
      </button>
    </span>
  );
}

export const ESTILO_TH = {
  color: "var(--text-secondary)",
  borderBottom: "1px solid var(--border-default)",
} as const;

export const ESTILO_TD = {
  borderBottom: "1px solid var(--border-default)",
} as const;

export const ESTILO_BOTON_PRIMARIO = { background: "#3B82F6" } as const;
export { ESTILO_INPUT };
