import React, { useMemo, useState } from 'react';
import { AssayComparisonItem } from '../types';
import {
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
  Sliders,
  ShieldAlert,
  HelpCircle,
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
  // Configurable study-defined criteria & assumptions
  const [allowableMargin, setAllowableMargin] = useState<number | undefined>(0.05);
  const [demingLambda, setDemingLambda] = useState<number>(1.0);
  const [tier1Rpd, setTier1Rpd] = useState<number>(15.0);
  const [tier2Rpd, setTier2Rpd] = useState<number>(25.0);
  const [lowConcCutoff, setLowConcCutoff] = useState<number>(0.05);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);

  const agreementSummary = useMemo(() => {
    return computeAgreementSummary(
      comparisons,
      allowableMargin,
      tier1Rpd,
      tier2Rpd,
      lowConcCutoff,
      demingLambda
    );
  }, [comparisons, allowableMargin, tier1Rpd, tier2Rpd, lowConcCutoff, demingLambda]);

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
          Ensure you have computed standard curves and estimated samples with matching sample IDs in both the <strong>Coagulation (Sample Estimator)</strong> and <strong>Phenoloxidase Kinetic</strong> tabs.
        </p>
      </div>
    );
  }

  const highCount = comparisons.filter((c) => c.isEligibleForQuantitativeStats && c.concordance === 'high').length;
  const modCount = comparisons.filter((c) => c.isEligibleForQuantitativeStats && c.concordance === 'moderate').length;
  const discCount = comparisons.filter((c) => c.isEligibleForQuantitativeStats && c.concordance === 'discordant').length;
  const eligibleComparisons = comparisons.filter((c) => c.isEligibleForQuantitativeStats && c.rpd !== null);
  const lowConcCount = eligibleComparisons.filter((c) => c.isLowConcentration).length;
  const avgRpd = eligibleComparisons.length > 0
    ? eligibleComparisons.reduce((acc, c) => acc + (c.rpd ?? 0), 0) / eligibleComparisons.length
    : NaN;
  const avgAbsDiff = eligibleComparisons.length > 0
    ? eligibleComparisons.reduce((acc, c) => acc + (c.absDiff ?? 0), 0) / eligibleComparisons.length
    : NaN;

  return (
    <div className={`space-y-5 ${isPrintView ? 'avoid-break' : ''}`}>
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
              <GitCompare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Orthogonal Method Comparison &amp; Agreement Analysis
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              Exploratory Analysis
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Statistical comparison between Turbidimetric Coagulation (OD) and Kinetic Phenoloxidase (dA/min) under CLSI EP09-A3 principles
          </p>
        </div>

        {!isPrintView && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-500" />
              <span>{showAdvancedSettings ? 'Hide Parameters' : 'Protocol Parameters'}</span>
            </button>
            <button
              onClick={onDownloadCsv}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              Export CSV
            </button>
          </div>
        )}
      </div>

      {/* Protocol Parameters & Criteria Configuration Drawer */}
      {!isPrintView && showAdvancedSettings && (
        <div className="p-4 bg-slate-50 dark:bg-slate-850/80 border border-slate-200 dark:border-slate-750 rounded-xl space-y-3 transition">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-750 pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Method Comparison Protocol Parameters &amp; Acceptance Criteria
            </h4>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              Must be defined a priori by the study protocol
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Allowable Difference Margin */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block text-[11px]">
                Allowable Difference Margin (± ΔEU/mL):
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.005"
                  min="0.001"
                  value={allowableMargin ?? ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setAllowableMargin(Number.isFinite(val) && val > 0 ? val : undefined);
                  }}
                  placeholder="e.g. 0.050"
                  className="w-full px-2.5 py-1 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Required for testing if 95% LoA intervals are within analytical acceptance limits.
              </p>
            </div>

            {/* Deming Lambda */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block text-[11px]">
                Deming Error Variance Ratio (λ):
              </label>
              <input
                type="number"
                step="0.1"
                min="0.01"
                value={demingLambda}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (Number.isFinite(val) && val > 0) setDemingLambda(val);
                }}
                className="w-full px-2.5 py-1 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded font-mono"
              />
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                λ = Var(ε_x)/Var(ε_y). λ = 1.00 assumes equal error variance between assays.
              </p>
            </div>

            {/* Exploratory Tier 1 & Tier 2 RPD */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block text-[11px]">
                Exploratory RPD Thresholds (%):
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <span className="text-[10px] text-slate-400 block">Tier 1:</span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="50"
                    value={tier1Rpd}
                    onChange={(e) => setTier1Rpd(parseFloat(e.target.value) || 15)}
                    className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded font-mono"
                  />
                </div>
                <div className="flex-1">
                  <span className="text-[10px] text-slate-400 block">Tier 2:</span>
                  <input
                    type="number"
                    step="1"
                    min="5"
                    max="100"
                    value={tier2Rpd}
                    onChange={(e) => setTier2Rpd(parseFloat(e.target.value) || 25)}
                    className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded font-mono"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Study-defined exploratory criteria for percentage agreement.
              </p>
            </div>

            {/* Low Concentration Cutoff */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block text-[11px]">
                Low Conc. Cutoff (EU/mL):
              </label>
              <input
                type="number"
                step="0.01"
                min="0.001"
                value={lowConcCutoff}
                onChange={(e) => setLowConcCutoff(parseFloat(e.target.value) || 0.05)}
                className="w-full px-2.5 py-1 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded font-mono"
              />
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Samples below this cutoff trigger warnings for mathematical RPD instability near baseline.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-center shadow-2xs">
          <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold mb-0.5">
            Matched / Eligible
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
            {eligibleComparisons.length} / {comparisons.length}
          </div>
          <div className="text-[10px] text-slate-400">
            {comparisons.length - eligibleComparisons.length} excluded
          </div>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-center shadow-2xs">
          <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold mb-0.5">
            Mean |ΔEU| (Absolute)
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
            {Number.isFinite(avgAbsDiff) ? `${avgAbsDiff.toFixed(4)}` : '—'}
          </div>
          <div className="text-[10px] text-slate-400">
            EU/mL absolute difference
          </div>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-center shadow-2xs">
          <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold mb-0.5">
            Mean RPD (Exploratory)
          </div>
          <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-mono">
            {Number.isFinite(avgRpd) ? `${avgRpd.toFixed(1)}%` : '—'}
          </div>
          <div className="text-[10px] text-slate-400">
            Relative percentage diff
          </div>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-center shadow-2xs">
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold mb-0.5">
            Tier 1 Agreement (≤{tier1Rpd}%)
          </div>
          <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300 font-mono">
            {highCount} / {eligibleComparisons.length}
          </div>
          <div className="text-[10px] text-slate-400">
            Study-defined criterion
          </div>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-center shadow-2xs">
          <div className="text-[10px] text-rose-500 dark:text-rose-400 uppercase font-bold mb-0.5">
            Discordant (&gt;{tier2Rpd}%)
          </div>
          <div className="text-lg font-bold text-rose-700 dark:text-rose-300 font-mono">
            {discCount} / {eligibleComparisons.length}
          </div>
          <div className="text-[10px] text-slate-400">
            Requires investigation
          </div>
        </div>
      </div>

      {/* Analytical & Statistical Diagnostics Banners */}
      {blandAltman && (
        <div className="space-y-2">
          {blandAltman.smallSampleWarning && (
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Small Sample Size (n = {blandAltman.n} &lt; 20):</strong> Bland-Altman Limits of Agreement and regression estimates have wide confidence intervals. Interpret these exploratory results with caution until replicated with standard sample sizes (n ≥ 40 recommended under CLSI EP09-A3).
              </div>
            </div>
          )}

          {blandAltman.hasProportionalBiasWarning && (
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Proportional Bias Detected in Differences:</strong> Paired differences correlate with mean concentration (trend slope = {blandAltman.trendSlope.toFixed(3)}, r = {blandAltman.trendR.toFixed(3)}, p = {blandAltman.trendPValue.toFixed(4)}). Standard constant limits of agreement may not be valid across the entire measurement range. Consider ratio or logarithmic transformation.
              </div>
            </div>
          )}

          {blandAltman.hasHeteroscedasticityWarning && (
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Heteroscedasticity Warning:</strong> Difference magnitude increases with mean concentration (r = {blandAltman.heteroscedasticityR.toFixed(3)}, p = {blandAltman.heteroscedasticityPValue.toFixed(4)}). Variance is not uniform across the dynamic range.
              </div>
            </div>
          )}

          {lowConcCount > 0 && (
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-lg flex items-start gap-2 text-xs text-blue-800 dark:text-blue-200">
              <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Low-Concentration Sensitivity Warning ({lowConcCount} sample(s) &lt; {lowConcCutoff} EU/mL):</strong> Near assay baseline, Relative Percent Difference (RPD) is mathematically amplified by division by near-zero denominators. Prioritize absolute difference |ΔEU| alongside percentage metrics.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Advanced Statistical Agreement Cards: Bland-Altman, Passing-Bablok, Deming */}
      {blandAltman && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1: Bland-Altman Agreement */}
          <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5 uppercase tracking-wider">
                <Scale className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Bland-Altman (CLSI EP09-A3)
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.2 bg-white dark:bg-slate-800 rounded border border-indigo-200 dark:border-indigo-800 text-indigo-600">
                n = {blandAltman.n}
              </span>
            </div>

            <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Mean Bias (d̄):</span>
                <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                  {blandAltman.meanBias >= 0 ? '+' : ''}{blandAltman.meanBias.toFixed(3)} EU/mL
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">95% CI for Bias:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  [{blandAltman.biasCiLower.toFixed(3)} to {blandAltman.biasCiUpper.toFixed(3)}]
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
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                <span>LoA 95% CIs:</span>
                <span className="font-mono text-right">
                  Lo: [{blandAltman.lowerLoaCiLower.toFixed(3)}, {blandAltman.lowerLoaCiUpper.toFixed(3)}]<br />
                  Hi: [{blandAltman.upperLoaCiLower.toFixed(3)}, {blandAltman.upperLoaCiUpper.toFixed(3)}]
                </span>
              </div>

              {blandAltman.allowableDifferenceMargin !== undefined && (
                <div className="pt-1 border-t border-indigo-100 dark:border-indigo-900/50 flex justify-between items-center text-[11px]">
                  <span className="text-slate-600 dark:text-slate-400">Allowable Margin (±{blandAltman.allowableDifferenceMargin.toFixed(3)}):</span>
                  <span
                    className={`font-semibold px-1.5 py-0.2 rounded text-[10px] ${
                      blandAltman.agreementAcceptable
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {blandAltman.agreementAcceptable ? 'Within Margin' : 'Exceeds Margin'}
                  </span>
                </div>
              )}

              <div className="text-[10px] text-slate-400 dark:text-slate-500 pt-1">
                Samples within LoA: {blandAltman.withinLoaCount}/{blandAltman.n} ({blandAltman.percentWithinLoa.toFixed(0)}%, descriptive Gaussian benchmark).
              </div>
            </div>
          </div>

          {/* Card 2: Passing-Bablok Exploratory Regression */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                <Activity className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Passing-Bablok Regression
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.2 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded">
                Exploratory
              </span>
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
                  <span className="text-slate-500 dark:text-slate-400">Linearity Cusum Test:</span>
                  <span
                    className={`font-semibold ${
                      passingBablok.isLinear
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {passingBablok.isLinear ? `Linear (stat: ${passingBablok.cusumStat} ≤ crit: ${passingBablok.cusumCritical})` : `Non-linear (stat: ${passingBablok.cusumStat} > crit: ${passingBablok.cusumCritical})`}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                  <span>Pairwise slopes:</span>
                  <span className="font-mono">
                    N = {passingBablok.validPairs} (Tied: x={passingBablok.tiedXPairs}, y={passingBablok.tiedYPairs}, S=-1 excluded: {passingBablok.sMinusOnePairs})
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 italic pt-1 border-t border-slate-200 dark:border-slate-800">
                  {passingBablok.interpretationNote}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Insufficient quantitative pairs (n ≥ 3 required).
              </p>
            )}
          </div>

          {/* Card 3: Deming Regression */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                <Scale className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Deming Regression (OLS)
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-600">
                λ = {demingLambda.toFixed(2)}
              </span>
            </div>

            {deming ? (
              <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Equation:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {deming.equation}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Slope (95% CI):</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {deming.slope.toFixed(3)} [{deming.slopeCiLower.toFixed(2)}–{deming.slopeCiUpper.toFixed(2)}]
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Intercept (95% CI):</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {deming.intercept.toFixed(3)} [{deming.interceptCiLower.toFixed(3)}–{deming.interceptCiUpper.toFixed(3)}]
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Correlation R²:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {deming.r2.toFixed(4)}
                  </span>
                </div>
                <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] text-slate-600 dark:text-slate-400 mt-1">
                  <strong>Explicit Assumption:</strong> {deming.assumptionStatement}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Insufficient quantitative pairs (n ≥ 3 required).
              </p>
            )}
          </div>
        </div>
      )}

      {/* Synthesis Commentary Card */}
      {agreementSummary && (
        <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1.5">
          <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
            <Info className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Method Comparison Synthesis Statement
          </div>
          <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
            {agreementSummary.concordanceStatement}
          </p>
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
        <table className="w-full text-xs text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-[11px]">
              <th className="px-3.5 py-2.5">Sample / Fraction</th>
              <th className="px-3 py-2.5 text-center">Coagulation EU/mL (OD)</th>
              <th className="px-3 py-2.5 text-center">Kinetic PO EU/mL (dA/min)</th>
              <th className="px-3 py-2.5 text-center">|ΔEU| (Absolute)</th>
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
              const isDisc = item.concordance === 'discordant';
              const isExcluded = item.agreement === 'EXCLUDED' || !item.isEligibleForQuantitativeStats;
              const isLowConc = item.isLowConcentration;

              return (
                <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                  <td className="px-3.5 py-2.5 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 mr-1.5">[{item.sampleId}]</span>
                    {item.name}
                    {isLowConc && (
                      <span className="ml-1.5 text-[9px] font-mono px-1.5 py-0.2 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded" title="Concentration near baseline: RPD is sensitive to small variations.">
                        &lt; {lowConcCutoff} EU
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono">
                    {item.coagEu !== null && Number.isFinite(item.coagEu) ? (
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {item.coagEu.toFixed(3)}
                      </span>
                    ) : (
                      <span className="text-amber-700 dark:text-amber-400 font-semibold text-[11px]">
                        {item.coagStatus || '< LOD'}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                      ({Number.isFinite(item.coagAbs) ? item.coagAbs.toFixed(3) : '—'} OD)
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono">
                    {item.poEu !== null && Number.isFinite(item.poEu) ? (
                      <span className="font-bold text-indigo-700 dark:text-indigo-400">
                        {item.poEu.toFixed(3)}
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 font-semibold text-[11px]">
                        {item.poStatus || 'N/A'}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                      ({Number.isFinite(item.poRate) ? item.poRate.toFixed(4) : '—'}/min)
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                    {item.absDiff !== null && Number.isFinite(item.absDiff) ? item.absDiff.toFixed(4) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono font-bold">
                    {item.rpd !== null && Number.isFinite(item.rpd) ? (
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
                    ) : (
                      <span className="text-slate-400 font-normal">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                    {item.ratio !== null && Number.isFinite(item.ratio) ? item.ratio.toFixed(2) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-center whitespace-nowrap">
                    {isExcluded ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        EXCLUDED
                      </span>
                    ) : (
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
                          ? `Tier 1 (≤${tier1Rpd}%)`
                          : isMod
                          ? `Tier 2 (≤${tier2Rpd}%)`
                          : `Discordant (>${tier2Rpd}%)`}
                      </span>
                    )}
                  </td>
                  <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-300 text-[11px] leading-tight min-w-[220px]">
                    {item.comment}
                    {item.lowConcentrationWarning && (
                      <div className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5 font-sans">
                        {item.lowConcentrationWarning}
                      </div>
                    )}
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
          Method Comparison Principles &amp; Epistemological Framework (CLSI EP09-A3)
        </div>
        <p className="leading-relaxed text-[11px]">
          Standard ordinary least-squares regression assumes the reference method has zero error, an assumption violated when comparing two experimental analytical assays. Under <strong>CLSI EP09-A3</strong> guidance:
        </p>
        <ul className="list-disc list-inside text-[11px] space-y-1 text-slate-600 dark:text-slate-400">
          <li>
            <strong>Bland-Altman Agreement:</strong> Plots difference (EU<sub>coag</sub> - EU<sub>po</sub>) against mean concentration to evaluate mean systematic bias (d̄) and 95% Limits of Agreement (d̄ ± 1.96 · s<sub>d</sub>) alongside 95% confidence intervals. <em>Note: The empirical percentage of points within LoA (~95% Gaussian expectation) is descriptive only and does not establish acceptable analytical agreement without comparing against an a priori allowable difference margin.</em>
          </li>
          <li>
            <strong>Passing-Bablok Regression:</strong> Non-parametric procedure based on shifted pairwise medians. Evaluates whether the slope 95% CI includes 1.0 (no proportional bias) and intercept 95% CI includes 0.0 (no constant systematic offset). A CI containing 1.0 and 0.0 represents failure to reject the null hypothesis of no difference, not positive confirmation of equivalence.
          </li>
          <li>
            <strong>Deming Regression:</strong> Orthogonal model accounting for measurement error in both assays simultaneously. Explicitly assumes an error variance ratio λ = Var(ε<sub>coag</sub>)/Var(ε<sub>po</sub>), defaulting to λ = 1.00 (equal error variance).
          </li>
          <li>
            <strong>Relative Percent Difference (RPD) &amp; Absolute Difference:</strong> RPD = (|EU<sub>coag</sub> - EU<sub>po</sub>| / ((EU<sub>coag</sub> + EU<sub>po</sub>) / 2)) × 100%. Because RPD becomes unstable as concentrations approach zero, absolute difference |ΔEU| must be evaluated alongside percentage metrics for low-concentration samples.
          </li>
        </ul>
      </div>
    </div>
  );
};

