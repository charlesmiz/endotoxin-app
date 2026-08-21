import React from 'react';
import { AssayComparisonItem } from '../types';
import {
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Download,
  Info,
  ArrowRightLeft,
} from 'lucide-react';

interface DualAssayComparisonSectionProps {
  comparisons: AssayComparisonItem[];
  onDownloadCsv: () => void;
  isPrintView?: boolean;
}

export const DualAssayComparisonSection: React.FC<DualAssayComparisonSectionProps> = ({
  comparisons,
  onDownloadCsv,
  isPrintView = false,
}) => {
  if (comparisons.length === 0) {
    return (
      <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2">
        <ArrowRightLeft className="w-8 h-8 text-slate-300 mx-auto" />
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          No Matching Samples Found for Cross-Assay Comparison
        </h4>
        <p className="text-xs text-slate-500 max-w-lg mx-auto">
          Ensure you have computed standard curves and estimated samples with matching names (e.g. <em>Commercial Infusion A</em>) in both the <strong>Coagulation (Sample Estimator)</strong> and <strong>Phenoloxidase Kinetic</strong> tabs.
        </p>
      </div>
    );
  }

  const highCount = comparisons.filter((c) => c.concordance === 'high').length;
  const modCount = comparisons.filter((c) => c.concordance === 'moderate').length;
  const discCount = comparisons.filter((c) => c.concordance === 'discordant').length;
  const avgRpd =
    comparisons.reduce((acc, c) => acc + c.rpd, 0) / comparisons.length;

  return (
    <div className={`space-y-4 ${isPrintView ? 'avoid-break' : ''}`}>
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
            <GitCompare className="w-4 h-4 text-indigo-600" />
            Orthogonal Dual-Assay Concordance &amp; Cross-Validation
          </h3>
          <p className="text-[11px] text-slate-500">
            Comparative analysis between Protein Coagulation (Turbidity) and Phenoloxidase Kinetics (Enzymatic Rate)
          </p>
        </div>

        {!isPrintView && (
          <button
            onClick={onDownloadCsv}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export Comparison CSV
          </button>
        )}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-white border border-slate-200 rounded-lg text-center">
          <div className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">
            Matched Samples
          </div>
          <div className="text-lg font-bold text-slate-900 font-mono">
            {comparisons.length}
          </div>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded-lg text-center">
          <div className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">
            Mean RPD (%)
          </div>
          <div className="text-lg font-bold text-indigo-600 font-mono">
            {avgRpd.toFixed(1)}%
          </div>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded-lg text-center">
          <div className="text-[10px] text-emerald-600 uppercase font-bold mb-0.5">
            High Concordance (≤15%)
          </div>
          <div className="text-lg font-bold text-emerald-700 font-mono">
            {highCount} / {comparisons.length}
          </div>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded-lg text-center">
          <div className="text-[10px] text-rose-500 uppercase font-bold mb-0.5">
            Discordant (&gt;30%)
          </div>
          <div className="text-lg font-bold text-rose-700 font-mono">
            {discCount}
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-xs text-left border-collapse min-w-[650px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
              <th className="px-3.5 py-2.5">Sample / Fraction</th>
              <th className="px-3 py-2.5 text-center">Coagulation EU/mL (OD)</th>
              <th className="px-3 py-2.5 text-center">Kinetic PO EU/mL (dA/min)</th>
              <th className="px-3 py-2.5 text-center">|ΔEU|</th>
              <th className="px-3 py-2.5 text-center">RPD (%)</th>
              <th className="px-3 py-2.5 text-center">Ratio</th>
              <th className="px-3 py-2.5 text-center">Concordance Status</th>
              <th className="px-3.5 py-2.5">Analytical Remark</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {comparisons.map((item) => {
              const isHigh = item.concordance === 'high';
              const isMod = item.concordance === 'moderate';

              return (
                <tr key={item.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-3.5 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                    {item.name}
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono">
                    <span className="font-bold text-slate-900">
                      {item.coagEu.toFixed(3)}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      ({item.coagAbs.toFixed(3)} OD)
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono">
                    <span className="font-bold text-indigo-700">
                      {item.poEu.toFixed(3)}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      ({item.poRate.toFixed(4)}/min)
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono text-slate-700">
                    {item.absDiff.toFixed(3)}
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono font-bold">
                    <span
                      className={
                        isHigh
                          ? 'text-emerald-700'
                          : isMod
                          ? 'text-amber-700'
                          : 'text-rose-600'
                      }
                    >
                      {item.rpd.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono text-slate-500 text-[11px]">
                    {Number.isFinite(item.ratio) ? item.ratio.toFixed(2) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-center whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        isHigh
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : isMod
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {isHigh ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : isMod ? (
                        <AlertTriangle className="w-3 h-3" />
                      ) : (
                        <AlertOctagon className="w-3 h-3" />
                      )}
                      {isHigh
                        ? 'High (≤15%)'
                        : isMod
                        ? 'Moderate (15-30%)'
                        : 'Discordant (>30%)'}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 text-slate-600 text-[11px] leading-tight min-w-[200px]">
                    {item.comment}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Orthogonal Methodology Note */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
        <div className="font-semibold text-slate-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
          <Info className="w-3.5 h-3.5 text-indigo-600" />
          Relative Percent Difference (RPD) Standard Formulation
        </div>
        <p className="leading-relaxed text-[11px]">
          RPD is defined as: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[10px]">RPD = (|EU_coag - EU_po| / ((EU_coag + EU_po) / 2)) × 100%</code>. Values &le; 15% provide strong statistical evidence that endotoxin detection in <em>Archachatina marginata</em> hemolymph is reproducible across both clotting cascade and prophenoloxidase activation pathways.
        </p>
      </div>
    </div>
  );
};
