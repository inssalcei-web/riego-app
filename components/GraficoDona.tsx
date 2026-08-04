"use client";

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

export function GraficoDona({
  labels,
  valores,
  colores,
}: {
  labels: string[];
  valores: number[];
  colores: string[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{ data: valores, backgroundColor: colores, borderWidth: 2, borderColor: "#fff" }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: { legend: { display: false } },
      },
    });
    return () => chartRef.current?.destroy();
  }, [JSON.stringify(labels), JSON.stringify(valores), JSON.stringify(colores)]);

  const total = valores.reduce((a, b) => a + b, 0);

  return (
    <div className="flex items-center gap-5">
      <div style={{ position: "relative", height: 150, width: 150, flexShrink: 0 }}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Gráfico de dona: ${labels.map((l, i) => `${l} ${valores[i]}`).join(", ")}`}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        {labels.map((l, i) => (
          <span key={l} className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            <span className="w-2.5 h-2.5 rounded shrink-0" style={{ background: colores[i] }} />
            {l} · {valores[i]}
            {total > 0 && <span>({Math.round((valores[i] / total) * 100)}%)</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
