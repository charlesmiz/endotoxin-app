import React, { useMemo } from 'react';
import { AssayComparisonItem } from '../types';
import {
  computeBlandAltman,
  computePassingBablok,
  computeDemingRegression,
  computeAgreementSummary,
} from '../utils/math';
import { MethodAgreementCharts } from './MethodAgreementCharts';
import {
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Download,
  Info,
  ArrowRightLeft,
  Activity,
  Scale,
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
  const agreementSummary = useMemo(() => {
    return computeAgreementSummary(comparisons);
  }, [comparisons]);

  const blandAltman = agreementSummary?.blandAltman ?? null;
  const passingBablok = agreementSummary?.passingBablok ?? null;
  const deming = agreementSummary?.deming ?? null;

  if (comparisons.length === 0) {
    return (
      <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-center space-y-2">
        <ArrowRightLeft className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          No Matching Samples Found for Cross-Assay Comparison
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
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
    <div className={`space-y-5 ${isPrintView ? 'avoid-break' : ''}`}>
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
            <GitCompare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Orthogonal Dual-Assay Concordance &amp; Cross-Validation
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Comparative agreement analysis between Protein Coagulation (540nm Turbidity) and Phenoloxidase Kinetics (490nm Velocity)
          </p>
        </div>

        {!isPrintView && (
          <button
            onClick={onDownloadCsv}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            Export Comparison CSV
          </button>
        )}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-center shadow-2xs">
          <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold mb-0.5">
            Matched Samples
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
            {comparisons.length}
          </div>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-center shadow-2xs">
          <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold mb-0.5">
            Mean RPD (%)
          </div>
          <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-mono">
            {avgRpd.toFixed(1)}%
          </div>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-center shadow-2xs">
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold mb-0.5">
            High Concordance (≤15%)
          </div>
          <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300 font-mono">
            {highCount} / {comparisons.length}
          </div>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-center shadow-2xs">
          <div className="text-[10px] text-rose-500 dark:text-rose-400 uppercase font-bold mb-0.5">
            Discordant (&gt;30%)
          </div>
          <div className="text-lg font-bold text-rose-700 dark:text-rose-300 font-mono">
            {discCount}
          </div>
        </div>
      </div>

      {/* Advanced Statistical Agreement Metrics: Bland-Altman & Passing-Bablok */}
      {blandAltman && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Bland-Altman Bias & LoA Card */}
          <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-lg space-y-1.5">
            <div className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5 uppercase tracking-wider">
              <Scale className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Bland-Altman Agreement (CLSI EP09)
            </div>
            <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Mean Bias (Coag - PO):</span>
                <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                  {blandAltman.meanBias >= 0 ? '+' : ''}{blandAltman.meanBias.toFixed(3)} EU/mL
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">SD of Differences:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  ±{blandAltman.sdBias.toFixed(3)} EU/mL
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">95% Limits of Agreement:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  [{blandAltman.lowerLoa.toFixed(3)}, {blandAltman.upperLoa.toFixed(3)}]
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">Samples Within 95% LoA:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {blandAltman.withinLoaCount} / {blandAltman.n} ({blandAltman.percentWithinLoa.toFixed(0)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Passing-Bablok / Deming Regression Card */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1.5">
            <div className="text-[11px] font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
              <Activity className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Passing-Bablok Regression
            </div>
            {passingBablok ? (
              <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Equation:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {passingBablok.equation}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Slope (95% CI):</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {passingBablok.slope.toFixed(3)} [{passingBablok.slopeCiLower.toFixed(2)}–{passingBablok.slopeCiUpper.toFixed(2)}]
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Intercept (95% CI):</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {passingBablok.intercept.toFixed(3)} [{passingBablok.interceptCiLower.toFixed(3)}–{passingBablok.interceptCiUpper.toFixed(3)}]
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">Proportional / Constant Bias:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {!passingBablok.hasProportionalBias && !passingBablok.hasConstantBias
                      ? 'None detected (CI includes 1 & 0)'
                      : passingBablok.hasProportionalBias
                      ? 'Proportional diff detected'
                      : 'Constant offset detected'}
                  </span>
                </div>
              </div>
            ) : deming ? (
              <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Deming Fit (λ=1):</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {deming.equation}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Correlation R²:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {deming.r2.toFixed(4)}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Deming orthogonal regression accounts for measurement error in both assays simultaneously.
                </p>
              </div>
            ) : null}
          </div>

          {/* Clinical Concordance Synthesis Card */}
          <div className="p-3.5 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-lg space-y-1.5 sm:col-span-2 lg:col-span-1">
            <div className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5 uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Orthogonal Synthesis Statement
            </div>
            <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
              {agreementSummary?.concordanceStatement}
            </p>
          </div>
        </div>
      )}

      {/* Interactive Method Comparison Scatter Plot & Bland-Altman Plot */}
      <MethodAgreementCharts
        comparisons={comparisons}
        blandAltman={blandAltman}
        passingBablok={passingBablok}
        deming={deming}
        isPrintView={isPrintView}
        height={260}
      />

      {/* Comparison Table */}
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs">
        <table className="w-full text-xs text-left border-collapse min-w-[650px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-[11px]">
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
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
            {comparisons.map((item) => {
              const isHigh = item.concordance === 'high';
              const isMod = item.concordance === 'moderate';

              return (
                <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                  <td className="px-3.5 py-2.5 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {item.name}
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {item.coagEu.toFixed(3)}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                      ({item.coagAbs.toFixed(3)} OD)
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono">
                    <span className="font-bold text-indigo-700 dark:text-indigo-400">
                      {item.poEu.toFixed(3)}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                      ({item.poRate.toFixed(4)}/min)
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono text-slate-700 dark:text-slate-300">
                    {item.absDiff.toFixed(3)}
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono font-bold">
                    <span
                      className={
                        isHigh
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : isMod
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }
                    >
                      {item.rpd.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                    {Number.isFinite(item.ratio) ? item.ratio.toFixed(2) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-center whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        isHigh
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                          : isMod
                          ? 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                          : 'bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
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
                  <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-300 text-[11px] leading-tight min-w-[200px]">
                    {item.comment}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Orthogonal Methodology & Math Note */}
      <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-400 space-y-2">
        <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
          <Info className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          Method Comparison Mathematics: Why Bland-Altman &amp; Passing-Bablok Instead of Simple R²?
        </div>
        <p className="leading-relaxed text-[11px]">
          Standard linear regression ($R^2$) and correlation assume the X-variable is measured without error, which is invalid when comparing two experimental bioassays. Under <strong>CLSI EP09-A3</strong> guidelines, method agreement requires:
        </p>
        <ul className="list-disc list-inside text-[11px] space-y-1 text-slate-600 dark:text-slate-400">
          <li>
            <strong>Bland-Altman Difference Plot:</strong> Plots difference (EU<sub>coag</sub> - EU<sub>po</sub>) against mean concentration to evaluate systematic bias (d̄) and 95% Limits of Agreement (d̄ ± 1.96 · s<sub>d</sub>), identifying whether difference magnitude depends on concentration.
          </li>
          <li>
            <strong>Passing-Bablok Regression:</strong> Non-parametric procedure with no assumption on error distribution. Evaluates whether the slope 95% CI includes 1.0 (no proportional bias) and intercept 95% CI includes 0.0 (no constant systematic bias).
          </li>
          <li>
            <strong>Relative Percent Difference (RPD):</strong> Standard formulation <code className="bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono text-[10px]">RPD = (|EU_coag - EU_po| / ((EU_coag + EU_po) / 2)) × 100%</code>. Values &le; 15% provide strong statistical evidence that endotoxin detection in <em>Archachatina marginata</em> hemolymph is reproducible across clotting and phenoloxidase activation pathways.
          </li>
        </ul>
      </div>
    </div>
  );
};
