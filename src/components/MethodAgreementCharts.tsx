import React, { useEffect, useRef, useState } from 'react';
import {
  AssayComparisonItem,
  BlandAltmanResult,
  PassingBablokResult,
  DemingResult,
} from '../types';
import {
  GitCompare,
  TrendingUp,
  Activity,
  Sliders,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface MethodAgreementChartsProps {
  comparisons: AssayComparisonItem[];
  blandAltman: BlandAltmanResult | null;
  passingBablok?: PassingBablokResult | null;
  deming?: DemingResult | null;
  height?: number;
  isPrintView?: boolean;
}

export const MethodAgreementCharts: React.FC<MethodAgreementChartsProps> = ({
  comparisons,
  blandAltman,
  passingBablok,
  deming,
  height = 300,
  isPrintView = false,
}) => {
  const scatterRef = useRef<HTMLDivElement>(null);
  const baRef = useRef<HTMLDivElement>(null);
  const [activeView, setActiveView] = useState<'both' | 'scatter' | 'blandAltman'>('both');

  const validPoints = comparisons.filter(
    (c) => Number.isFinite(c.coagEu) && Number.isFinite(c.poEu)
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.Plotly) return;

    const renderAllCharts = () => {
      const isDark =
        !isPrintView && document.documentElement.classList.contains('dark');

      // 1. Render Method Comparison Scatter Plot (Coagulation vs PO Kinetics)
      if (scatterRef.current && validPoints.length > 0) {
        const xVals = validPoints.map((c) => c.coagEu);
        const yVals = validPoints.map((c) => c.poEu);
        const maxVal = Math.max(...xVals, ...yVals, 1.0) * 1.15;

        const scatterTraces: any[] = [];

        // Identity line (y = x)
        scatterTraces.push({
          x: [0, maxVal],
          y: [0, maxVal],
          mode: 'lines',
          name: 'Line of Identity (y = x)',
          line: {
            color: isDark ? '#64748b' : '#94a3b8',
            width: 1.5,
            dash: 'dot',
          },
          hoverinfo: 'none',
        });

        // Fitted regression line (Passing-Bablok or Deming)
        const fitSlope = passingBablok ? passingBablok.slope : deming ? deming.slope : 1.0;
        const fitIntercept = passingBablok ? passingBablok.intercept : deming ? deming.intercept : 0.0;
        const fitName = passingBablok
          ? `Passing-Bablok: ${passingBablok.equation}`
          : deming
          ? `Deming Fit: ${deming.equation}`
          : 'Fit Line';

        scatterTraces.push({
          x: [0, maxVal],
          y: [fitIntercept, fitSlope * maxVal + fitIntercept],
          mode: 'lines',
          name: fitName,
          line: {
            color: isDark ? '#818cf8' : '#4f46e5',
            width: 2,
          },
        });

        // Matched Sample Points
        scatterTraces.push({
          x: xVals,
          y: yVals,
          text: validPoints.map(
            (c) =>
              `<b>${c.name}</b><br>Coagulation: ${c.coagEu.toFixed(3)} EU/mL<br>PO Kinetic: ${c.poEu.toFixed(3)} EU/mL<br>RPD: ${c.rpd.toFixed(1)}%`
          ),
          hoverinfo: 'text',
          mode: 'markers',
          name: 'Samples',
          marker: {
            color: validPoints.map((c) =>
              c.concordance === 'high'
                ? isDark
                  ? '#34d399'
                  : '#059669'
                : c.concordance === 'moderate'
                ? isDark
                  ? '#fbbf24'
                  : '#d97706'
                : isDark
                ? '#f87171'
                : '#dc2626'
            ),
            size: isPrintView ? 7 : 9,
            symbol: 'circle',
            line: {
              color: isDark ? '#1e293b' : '#ffffff',
              width: 1.5,
            },
          },
        });

        const scatterLayout = {
          title: {
            text: isPrintView ? 'Method Scatter (y=x)' : 'Coagulation vs. Phenoloxidase EU/mL',
            font: {
              size: isPrintView ? 11 : 12,
              color: isDark ? '#f1f5f9' : '#1e293b',
              weight: 'bold',
            },
          },
          margin: isPrintView
            ? { t: 25, r: 15, b: 35, l: 45 }
            : { t: 30, r: 20, b: 40, l: 50 },
          showlegend: !isPrintView,
          legend: {
            orientation: 'h',
            x: 0,
            y: 1.15,
            font: { size: 9, color: isDark ? '#cbd5e1' : '#64748b' },
          },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          xaxis: {
            title: {
              text: 'Coagulation Estimate (EU/mL)',
              font: { size: isPrintView ? 9 : 10, color: isDark ? '#94a3b8' : '#64748b' },
            },
            range: [0, maxVal],
            gridcolor: isDark ? '#334155' : '#f1f5f9',
            tickfont: { size: isPrintView ? 8 : 9, color: isDark ? '#cbd5e1' : '#94a3b8' },
          },
          yaxis: {
            title: {
              text: 'Phenoloxidase Estimate (EU/mL)',
              font: { size: isPrintView ? 9 : 10, color: isDark ? '#94a3b8' : '#64748b' },
            },
            range: [0, maxVal],
            gridcolor: isDark ? '#334155' : '#f1f5f9',
            tickfont: { size: isPrintView ? 8 : 9, color: isDark ? '#cbd5e1' : '#94a3b8' },
          },
          autosize: true,
        };

        window.Plotly.react(scatterRef.current, scatterTraces, scatterLayout, {
          responsive: true,
          displayModeBar: false,
        });
      }

      // 2. Render Bland-Altman Plot (Mean vs Difference)
      if (baRef.current && blandAltman && blandAltman.points.length > 0) {
        const means = blandAltman.points.map((p) => p.mean);
        const diffs = blandAltman.points.map((p) => p.diff);
        const xMax = Math.max(...means, 0.5) * 1.15;
        const ySpan = Math.max(
          Math.abs(blandAltman.upperLoa),
          Math.abs(blandAltman.lowerLoa),
          ...diffs.map((d) => Math.abs(d)),
          0.1
        ) * 1.25;

        const baTraces: any[] = [];

        // Zero reference line
        baTraces.push({
          x: [0, xMax],
          y: [0, 0],
          mode: 'lines',
          name: 'Zero Bias (0.0)',
          line: {
            color: isDark ? '#475569' : '#cbd5e1',
            width: 1,
            dash: 'dot',
          },
          hoverinfo: 'none',
        });

        // Mean Bias line
        baTraces.push({
          x: [0, xMax],
          y: [blandAltman.meanBias, blandAltman.meanBias],
          mode: 'lines',
          name: `Mean Bias: ${blandAltman.meanBias.toFixed(3)} EU/mL`,
          line: {
            color: isDark ? '#818cf8' : '#4f46e5',
            width: 2,
          },
        });

        // Upper Limit of Agreement (+1.96 SD)
        baTraces.push({
          x: [0, xMax],
          y: [blandAltman.upperLoa, blandAltman.upperLoa],
          mode: 'lines',
          name: `+1.96 SD: ${blandAltman.upperLoa.toFixed(3)} EU/mL`,
          line: {
            color: isDark ? '#f87171' : '#ef4444',
            width: 1.5,
            dash: 'dash',
          },
        });

        // Lower Limit of Agreement (-1.96 SD)
        baTraces.push({
          x: [0, xMax],
          y: [blandAltman.lowerLoa, blandAltman.lowerLoa],
          mode: 'lines',
          name: `-1.96 SD: ${blandAltman.lowerLoa.toFixed(3)} EU/mL`,
          line: {
            color: isDark ? '#f87171' : '#ef4444',
            width: 1.5,
            dash: 'dash',
          },
        });

        // Sample Differences
        baTraces.push({
          x: means,
          y: diffs,
          text: blandAltman.points.map(
            (p) =>
              `<b>${p.name}</b><br>Mean: ${p.mean.toFixed(3)} EU/mL<br>Δ (Coag - PO): ${p.diff.toFixed(3)} EU/mL<br>RPD: ${p.rpd.toFixed(1)}%<br>${
                p.isOutlier ? '⚠️ Exceeds 95% LoA' : '✅ Within 95% LoA'
              }`
          ),
          hoverinfo: 'text',
          mode: 'markers',
          name: 'Sample Differences',
          marker: {
            color: blandAltman.points.map((p) =>
              p.isOutlier
                ? isDark
                  ? '#f87171'
                  : '#dc2626'
                : isDark
                ? '#38bdf8'
                : '#0284c7'
            ),
            size: isPrintView ? 7 : 9,
            symbol: blandAltman.points.map((p) =>
              p.isOutlier ? 'diamond' : 'circle'
            ),
            line: {
              color: isDark ? '#1e293b' : '#ffffff',
              width: 1.5,
            },
          },
        });

        const baLayout = {
          title: {
            text: isPrintView
              ? 'Bland-Altman Difference Plot'
              : 'Bland-Altman: (Coagulation - PO) vs. Mean EU/mL',
            font: {
              size: isPrintView ? 11 : 12,
              color: isDark ? '#f1f5f9' : '#1e293b',
              weight: 'bold',
            },
          },
          margin: isPrintView
            ? { t: 25, r: 15, b: 35, l: 45 }
            : { t: 30, r: 20, b: 40, l: 50 },
          showlegend: !isPrintView,
          legend: {
            orientation: 'h',
            x: 0,
            y: 1.15,
            font: { size: 9, color: isDark ? '#cbd5e1' : '#64748b' },
          },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          xaxis: {
            title: {
              text: 'Mean of Assays: (Coag + PO) / 2 (EU/mL)',
              font: { size: isPrintView ? 9 : 10, color: isDark ? '#94a3b8' : '#64748b' },
            },
            range: [0, xMax],
            gridcolor: isDark ? '#334155' : '#f1f5f9',
            tickfont: { size: isPrintView ? 8 : 9, color: isDark ? '#cbd5e1' : '#94a3b8' },
          },
          yaxis: {
            title: {
              text: 'Difference: Coag - PO (EU/mL)',
              font: { size: isPrintView ? 9 : 10, color: isDark ? '#94a3b8' : '#64748b' },
            },
            range: [-ySpan, ySpan],
            gridcolor: isDark ? '#334155' : '#f1f5f9',
            tickfont: { size: isPrintView ? 8 : 9, color: isDark ? '#cbd5e1' : '#94a3b8' },
          },
          autosize: true,
        };

        window.Plotly.react(baRef.current, baTraces, baLayout, {
          responsive: true,
          displayModeBar: false,
        });
      }
    };

    renderAllCharts();

    window.addEventListener('app-theme-changed', renderAllCharts);

    const resizeObserver = new ResizeObserver(() => {
      if (typeof window !== 'undefined' && window.Plotly) {
        if (scatterRef.current) {
          try {
            window.Plotly.Plots.resize(scatterRef.current);
          } catch {
            // ignore
          }
        }
        if (baRef.current) {
          try {
            window.Plotly.Plots.resize(baRef.current);
          } catch {
            // ignore
          }
        }
      }
    });

    if (scatterRef.current) resizeObserver.observe(scatterRef.current);
    if (baRef.current) resizeObserver.observe(baRef.current);

    return () => {
      window.removeEventListener('app-theme-changed', renderAllCharts);
      resizeObserver.disconnect();
    };
  }, [comparisons, blandAltman, passingBablok, deming, activeView, isPrintView]);

  if (validPoints.length < 2) {
    return (
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400">
        Requires at least 2 matched samples with calculated endotoxin estimates to generate agreement plots.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!isPrintView && (
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Method Agreement Visualizations (CLSI EP09-A3 Standard)
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[11px] font-medium text-slate-600 dark:text-slate-300">
            <button
              onClick={() => setActiveView('both')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                activeView === 'both'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-semibold'
                  : 'hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Side-by-Side
            </button>
            <button
              onClick={() => setActiveView('scatter')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                activeView === 'scatter'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-semibold'
                  : 'hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Method Scatter (y=x)
            </button>
            <button
              onClick={() => setActiveView('blandAltman')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                activeView === 'blandAltman'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-semibold'
                  : 'hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Bland-Altman
            </button>
          </div>
        </div>
      )}

      {/* Grid of charts */}
      <div
        className={`grid gap-4 ${
          activeView === 'both' || isPrintView
            ? 'grid-cols-1 lg:grid-cols-2'
            : 'grid-cols-1'
        }`}
      >
        {/* Scatter Plot */}
        {(activeView === 'both' || activeView === 'scatter' || isPrintView) && (
          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div
              ref={scatterRef}
              style={{ height: `${height}px` }}
              className="w-full"
            />
            <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between px-1">
              <span>Points on dotted line show exact 1:1 agreement.</span>
              {passingBablok && (
                <span className="font-mono text-indigo-600 dark:text-indigo-400">
                  Passing-Bablok: {passingBablok.equation}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Bland-Altman Plot */}
        {(activeView === 'both' || activeView === 'blandAltman' || isPrintView) && (
          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div
              ref={baRef}
              style={{ height: `${height}px` }}
              className="w-full"
            />
            {blandAltman && (
              <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between px-1">
                <span>
                  Mean Bias: <strong className="text-indigo-600 dark:text-indigo-400">{blandAltman.meanBias.toFixed(3)}</strong> EU/mL
                </span>
                <span>
                  95% Limits of Agreement: [{blandAltman.lowerLoa.toFixed(3)} to {blandAltman.upperLoa.toFixed(3)}]
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
