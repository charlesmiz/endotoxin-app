import React, { useEffect, useRef } from 'react';
import { CalibrationModelFit, SampleEstimateResult } from '../types';

interface PlotlyChartProps {
  calibration: CalibrationModelFit | null;
  sampleResults?: SampleEstimateResult[];
  height?: number | string;
  isPrintView?: boolean;
}

declare global {
  interface Window {
    Plotly: any;
  }
}

export const PlotlyChart: React.FC<PlotlyChartProps> = ({
  calibration,
  sampleResults = [],
  height = 280,
  isPrintView = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const renderChart = () => {
      if (typeof window === 'undefined' || !window.Plotly) return;

      const traces: any[] = [];

      if (calibration && calibration.points && calibration.points.length > 0) {
        // Calibration standards
        traces.push({
          x: calibration.points.map((p) => p[0]),
          y: calibration.points.map((p) => p[1]),
          mode: 'markers',
          type: 'scatter',
          name: 'Standards',
          marker: {
            color: '#4f46e5',
            size: isPrintView ? 7 : 9,
            line: { color: 'white', width: 1.5 },
          },
        });

        // Fitted line/curve
        const pts = calibration.points;
        const xMin = Math.min(0, ...pts.map((p) => p[0]));
        const xMax = Math.max(...pts.map((p) => p[0]));
        const grid = Array.from(
          { length: 81 },
          (_, i) => xMin + ((xMax - xMin) * i) / 80
        );

        const ys = grid.map((x) => {
          if (calibration.type === 'quadratic') {
            return (
              (calibration.a ?? 0) * x * x +
              (calibration.b ?? 0) * x +
              (calibration.c ?? 0)
            );
          }
          return (calibration.slope ?? 0) * x + (calibration.intercept ?? 0);
        });

        traces.push({
          x: grid,
          y: ys,
          mode: 'lines',
          type: 'scatter',
          name: 'Fit Line',
          line: {
            color: '#4f46e5',
            width: 2,
            dash: calibration.type === 'quadratic' ? 'dot' : 'dash',
          },
          opacity: 0.85,
        });

        // Plotted estimated samples if available
        if (sampleResults.length > 0) {
          const validSamples = sampleResults.filter((r) =>
            Number.isFinite(r.eu)
          );
          if (validSamples.length > 0) {
            traces.push({
              x: validSamples.map((r) => r.eu),
              y: validSamples.map((r) => r.abs),
              mode: 'markers',
              type: 'scatter',
              name: 'Samples',
              marker: {
                color: '#d97706',
                symbol: 'diamond',
                size: isPrintView ? 7 : 9,
              },
            });
          }
        }
      }

      const layout = {
        margin: isPrintView
          ? { t: 15, r: 12, b: 35, l: 40 }
          : { t: 20, r: 16, b: 40, l: 46 },
        showlegend: false,
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        xaxis: {
          title: {
            text: 'Endotoxin (EU/mL)',
            font: { size: isPrintView ? 9 : 10, color: '#64748b' },
          },
          gridcolor: '#f1f5f9',
          tickfont: { size: isPrintView ? 8 : 9, color: '#94a3b8' },
        },
        yaxis: {
          title: {
            text: 'Absorbance',
            font: { size: isPrintView ? 9 : 10, color: '#64748b' },
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
        console.warn('Plotly render error:', err);
      }
    };

    renderChart();

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current && window.Plotly) {
        try {
          window.Plotly.Plots.resize(containerRef.current);
        } catch (e) {
          // ignore resize errors
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [calibration, sampleResults, isPrintView]);

  return (
    <div
      ref={containerRef}
      className={`w-full ${isPrintView ? 'print-chart' : ''}`}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    />
  );
};
