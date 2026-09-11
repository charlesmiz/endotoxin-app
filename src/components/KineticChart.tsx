import React, { useEffect, useRef } from 'react';
import { KineticResult } from '../types';

interface KineticChartProps {
  results: KineticResult[];
  height?: number | string;
  isPrintView?: boolean;
}

const PALETTE_LIGHT = [
  '#4f46e5', // indigo
  '#059669', // emerald
  '#d97706', // amber
  '#dc2626', // red
  '#0284c7', // sky
  '#7c3aed', // violet
  '#db2777', // pink
  '#475569', // slate
];

const PALETTE_DARK = [
  '#818cf8', // indigo
  '#34d399', // emerald
  '#fbbf24', // amber
  '#f87171', // red
  '#38bdf8', // sky
  '#a78bfa', // violet
  '#f472b6', // pink
  '#94a3b8', // slate
];

export const KineticChart: React.FC<KineticChartProps> = ({
  results,
  height = 300,
  isPrintView = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const renderChart = () => {
      if (typeof window === 'undefined' || !window.Plotly) return;

      const isDark = !isPrintView && document.documentElement.classList.contains('dark');
      const palette = isDark ? PALETTE_DARK : PALETTE_LIGHT;

      const validResults = results.filter(
        (r) => r.valid && r.timePoints.length >= 2
      );

      const traces: any[] = [];

      validResults.forEach((res, index) => {
        const color = palette[index % palette.length];

        // Kinetic progression points & line
        traces.push({
          x: res.timePoints,
          y: res.absReadings,
          mode: 'lines+markers',
          type: 'scatter',
          name: res.name,
          line: {
            color,
            width: isPrintView ? 1.5 : 2,
            shape: 'linear',
          },
          marker: {
            color,
            size: isPrintView ? 6 : 7,
            symbol: index % 2 === 0 ? 'circle' : 'square',
          },
          hovertemplate: `<b>${res.name}</b><br>Time: %{x} min<br>Abs: %{y:.4f} OD<br>Rate: ${res.rate.toFixed(
            4
          )} OD/min<extra></extra>`,
        });
      });

      const layout = {
        margin: isPrintView
          ? { t: 15, r: 15, b: 35, l: 45 }
          : { t: 20, r: 20, b: 40, l: 50 },
        showlegend: true,
        legend: {
          orientation: 'h',
          x: 0,
          y: isPrintView ? -0.2 : 1.12,
          font: { size: isPrintView ? 8 : 9, color: isDark ? '#cbd5e1' : '#475569' },
        },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        xaxis: {
          title: {
            text: 'Reaction Time (minutes)',
            font: { size: isPrintView ? 9 : 11, color: isDark ? '#94a3b8' : '#64748b' },
          },
          gridcolor: isDark ? '#334155' : '#f1f5f9',
          tickfont: { size: isPrintView ? 8 : 9, color: isDark ? '#cbd5e1' : '#94a3b8' },
        },
        yaxis: {
          title: {
            text: 'Absorbance at λ (OD)',
            font: { size: isPrintView ? 9 : 11, color: isDark ? '#94a3b8' : '#64748b' },
          },
          gridcolor: isDark ? '#334155' : '#f1f5f9',
          tickfont: { size: isPrintView ? 8 : 9, color: isDark ? '#cbd5e1' : '#94a3b8' },
        },
        autosize: true,
      };

      try {
        window.Plotly.react(containerRef.current, traces, layout, {
          responsive: true,
          displayModeBar: false,
        });
      } catch (err) {
        console.warn('Plotly kinetic chart render error:', err);
      }
    };

    renderChart();

    window.addEventListener('app-theme-changed', renderChart);

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current && window.Plotly) {
        try {
          window.Plotly.Plots.resize(containerRef.current);
        } catch {
          // ignore
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      window.removeEventListener('app-theme-changed', renderChart);
      resizeObserver.disconnect();
    };
  }, [results, isPrintView]);

  return (
    <div
      ref={containerRef}
      className={`w-full ${isPrintView ? 'print-chart' : ''}`}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    />
  );
};
