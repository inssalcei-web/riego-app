"use client";

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

export function GraficoBarrasHorizontal({
  labels,
  valores,
  color = "#3B82F6",
  sufijo = "",
}: {
  labels: string[];
  valores: number[];
  color?: string;
  sufijo?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [{ data: valores, backgroundColor: color, borderRadius: 4, barThickness: 16 }],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.x}${sufijo}` } },
        },
        scales: {
          x: { ticks: { color: "#64748B" }, grid: { color: "#E2E8F0" } },
          y: { ticks: { color: "#64748B" }, grid: { display: false } },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [JSON.stringify(labels), JSON.stringify(valores), color, sufijo]);

  const alto = Math.max(120, labels.length * 32 + 40);

  return (
    <div style={{ position: "relative", height: alto }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Barras horizontales: ${labels.map((l, i) => `${l} ${valores[i]}${sufijo}`).join(", ")}`}
      />
    </div>
  );
}
