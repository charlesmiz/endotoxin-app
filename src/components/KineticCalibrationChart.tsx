import React, { useEffect, useRef } from 'react';
import { KineticCalibrationModel, KineticResult } from '../types';

interface KineticCalibrationChartProps {
  model: KineticCalibrationModel;
  samples?: KineticResult[];
  height?: number | string;
  isPrintView?: boolean;
}

export const KineticCalibrationChart: React.FC<KineticCalibrationChartProps> = ({
  model,
  samples = [],
  height = 260,
  isPrintView = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !model) return;

    const renderChart = () => {
      if (typeof window === 'undefined' || !window.Plotly) return;

      const stdX = model.points.map((p) => p[0]);
      const stdY = model.points.map((p) => p[1]);

      // Standard points trace
      const stdTrace: any = {
        x: stdX,
        y: stdY,
        mode: 'markers',
        type: 'scatter',
        name: 'PO Kinetic Standards',
        marker: {
          color: '#4f46e5',
          size: isPrintView ? 7 : 9,
          symbol: 'circle',
          line: { color: '#ffffff', width: 1.5 },
        },
        hovertemplate: 'Standard: %{x} EU/mL<br>Rate: %{y:.5f} OD/min<extra></extra>',
      };

      // Model line
      const minX = Math.min(...stdX);
      const maxX = Math.max(...stdX);
      const span = maxX - minX || 1;
      const xLine = [
        Math.max(0, minX - 0.05 * span),
        maxX + 0.08 * span,
      ];
      const yLine = xLine.map((x) => model.slope * x + model.intercept);

      const lineTrace: any = {
        x: xLine,
        y: yLine,
        mode: 'lines',
        type: 'scatter',
        name: `Fit: v = ${model.slope.toFixed(4)}x + ${model.intercept.toFixed(4)} (R²=${model.r2.toFixed(4)})`,
        line: {
          color: '#6366f1',
          width: isPrintView ? 1.5 : 2,
          dash: 'solid',
        },
        hoverinfo: 'name',
      };

      const traces: any[] = [lineTrace, stdTrace];

      // Sample projections
      const validSamples = samples.filter(
        (s) =>
          s.valid &&
          s.type === 'sample' &&
          s.estimatedEu !== undefined &&
          Number.isFinite(s.estimatedEu)
      );

      if (validSamples.length > 0) {
        const sampX = validSamples.map((s) => s.estimatedEu!);
        const sampY = validSamples.map((s) => s.rate);
        const sampNames = validSamples.map((s) => s.name);

        const sampleTrace: any = {
          x: sampX,
          y: sampY,
          mode: 'markers',
          type: 'scatter',
          name: 'Estimated Samples',
          text: sampNames,
          marker: {
            color: '#059669',
            size: isPrintView ? 7 : 9,
            symbol: 'diamond',
            line: { color: '#ffffff', width: 1.5 },
          },
          hovertemplate: '<b>%{text}</b><br>Rate: %{y:.5f} OD/min<br>Est. EU: %{x:.4f} EU/mL<extra></extra>',
        };
        traces.push(sampleTrace);
      }

      const layout = {
        margin: isPrintView
          ? { t: 15, r: 15, b: 35, l: 45 }
          : { t: 20, r: 20, b: 40, l: 50 },
        showlegend: true,
        legend: {
          orientation: 'h',
          x: 0,
          y: isPrintView ? -0.2 : 1.12,
          font: { size: isPrintView ? 8 : 9, color: '#475569' },
        },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        xaxis: {
          title: {
            text: 'Endotoxin Concentration (EU/mL)',
            font: { size: isPrintView ? 9 : 11, color: '#64748b' },
          },
          gridcolor: '#f1f5f9',
          tickfont: { size: isPrintView ? 8 : 9, color: '#94a3b8' },
        },
        yaxis: {
          title: {
            text: 'Kinetic Rate dA/dt (OD/min)',
            font: { size: isPrintView ? 9 : 11, color: '#64748b' },
          },
          gridcolor: '#f1f5f9',
          tickfont: { size: isPrintView ? 8 : 9, color: '#94a3b8' },
        },
        autosize: true,
      };

      try {
        window.Plotly.react(containerRef.current, traces, layout, {
          responsive: true,
          displayModeBar: false,
        });
      } catch (err) {
        console.warn('Plotly kinetic cal render error:', err);
      }
    };

    renderChart();

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
      resizeObserver.disconnect();
    };
  }, [model, samples, isPrintView]);

  return (
    <div
      ref={containerRef}
      className={`w-full ${isPrintView ? 'print-chart' : ''}`}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    />
  );
};
