import React, { useState } from 'react';
import {
  CalibrationModelFit,
  SampleEstimateResult,
  KineticResult,
  KineticCalibrationModel,
  AssayComparisonItem,
  WavelengthSettings,
} from '../types';
import { PlotlyChart } from './PlotlyChart';
import { KineticChart } from './KineticChart';
import { KineticCalibrationChart } from './KineticCalibrationChart';
import { DualAssayComparisonSection } from './DualAssayComparisonSection';
import {
  Printer,
  FlaskConical,
  FileCheck,
  Activity,
  GitCompare,
  Download,
  Filter,
  Layers,
  ChevronDown,
  Sliders,
} from 'lucide-react';

interface ValidationReportTabProps {
  runLabel: string;
  calibration: CalibrationModelFit | null;
  results: SampleEstimateResult[];
  kineticResults?: KineticResult[];
  kineticModel?: KineticCalibrationModel | null;
  comparisons?: AssayComparisonItem[];
  threshold: number;
  wavelengths?: WavelengthSettings;
  onPrint: () => void;
  onDownloadCoagCsv?: () => void;
  onDownloadKineticCsv?: () => void;
  onDownloadComparisonCsv?: () => void;
}

export const ValidationReportTab: React.FC<ValidationReportTabProps> = ({
  runLabel,
  calibration,
  results,
  kineticResults = [],
  kineticModel = null,
  comparisons = [],
  threshold,
  wavelengths = { coagulation: 540, phenoloxidase: 490 },
  onPrint,
  onDownloadCoagCsv,
  onDownloadKineticCsv,
  onDownloadComparisonCsv,
}) => {
  const [reportScope, setReportScope] = useState<'all' | 'coag' | 'po' | 'compare'>('all');
  const [showComparison, setShowComparison] = useState<boolean>(true);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const validKinetic = kineticResults.filter((k) => k.valid);
  const hasCoag = Boolean(calibration || results.length > 0);
  const hasPo = validKinetic.length > 0;
  const hasComparison = comparisons.length > 0;

  const showCoagSection = reportScope === 'all' || reportScope === 'coag';
  const showPoSection = reportScope === 'all' || reportScope === 'po';
  const showCompareSection =
    (reportScope === 'all' && showComparison && hasComparison) ||
    reportScope === 'compare';

  const generateSummaryText = () => {
    if (!hasCoag && !hasPo) {
      return 'No calibration curve or kinetic assays computed yet. Please complete the Standard Curve or Phenoloxidase tabs.';
    }

    const segments: string[] = [];

    if (showCoagSection && calibration) {
      const r2Text = Number.isFinite(calibration.r2)
        ? calibration.r2.toFixed(4)
        : 'undefined';
      let coagText = `Endpoint Coagulation Assay (${wavelengths.coagulation} nm): Evaluated with ${calibration.points.length} standard levels yielding R² = ${r2Text}.`;
      if (results.length > 0) {
        const above = results.filter(
          (r) => Number.isFinite(r.eu) && r.eu >= threshold
        ).length;
        coagText += ` ${results.length} commercial sample(s) analyzed (${above} exceeding ${threshold} EU/mL threshold).`;
      }
      segments.push(coagText);
    }

    if (showPoSection && validKinetic.length > 0) {
      const maxRate = Math.max(...validKinetic.map((k) => k.rate));
      let poText = `Phenoloxidase Kinetics (${wavelengths.phenoloxidase} nm): Analyzed ${validKinetic.length} series (peak velocity dA/dt = ${maxRate.toFixed(4)} OD/min).`;
      if (kineticModel) {
        poText += ` Standard calibration curve achieved R² = ${kineticModel.r2.toFixed(4)}.`;
      }
      segments.push(poText);
    }

    if (showCompareSection && comparisons.length > 0) {
      const highCount = comparisons.filter((c) => c.concordance === 'high').length;
      const meanRpd =
        comparisons.reduce((acc, c) => acc + c.rpd, 0) / comparisons.length;
      segments.push(
        `Dual-Assay Concordance: ${comparisons.length} sample(s) cross-compared with mean RPD of ${meanRpd.toFixed(1)}% (${highCount}/${comparisons.length} high concordance ≤15%).`
      );
    }

    return segments.join(' ');
  };

  return (
    <div className="space-y-4">
      {/* Control & Filter Toolbar (Screen Only) */}
      <div className="no-print bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mr-1">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            Report Content:
          </span>

          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            <button
              onClick={() => setReportScope('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                reportScope === 'all'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Full Multi-Assay Dossier
            </button>
            <button
              onClick={() => setReportScope('coag')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                reportScope === 'coag'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Coagulation Only
            </button>
            <button
              onClick={() => setReportScope('po')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                reportScope === 'po'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Phenoloxidase Only
            </button>
            {hasComparison && (
              <button
                onClick={() => setReportScope('compare')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                  reportScope === 'compare'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Concordance Only
              </button>
            )}
          </div>

          {reportScope === 'all' && hasComparison && (
            <label className="flex items-center gap-1.5 ml-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showComparison}
                onChange={(e) => setShowComparison(e.target.checked)}
                className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <span>Include Dual-Assay Comparison Section</span>
            </label>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 relative">
          {/* Export CSV Options */}
          <div className="relative">
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isExportMenuOpen && (
              <div
                className="absolute right-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-20"
                onClick={() => setIsExportMenuOpen(false)}
              >
                {onDownloadCoagCsv && (
                  <button
                    onClick={onDownloadCoagCsv}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <FlaskConical className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Download Coagulation CSV</span>
                  </button>
                )}
                {onDownloadKineticCsv && (
                  <button
                    onClick={onDownloadKineticCsv}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Activity className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Download Phenoloxidase CSV</span>
                  </button>
                )}
                {onDownloadComparisonCsv && hasComparison && (
                  <button
                    onClick={onDownloadComparisonCsv}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer border-t border-slate-100"
                  >
                    <GitCompare className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Download Concordance CSV</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            onClick={onPrint}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Print / Export PDF
          </button>
        </div>
      </div>

      {/* Main Report Document Card */}
      <article className="w-full bg-white rounded-xl border border-slate-200 shadow-xs p-6 sm:p-8 md:p-10 space-y-6 print-only-active text-slate-900">
        {/* Header Section */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b-2 border-indigo-600 print-compact-space avoid-break">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-700">
              <FlaskConical className="w-6 h-6 shrink-0" />
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Endotoxin Kit —{' '}
                {reportScope === 'coag'
                  ? 'Coagulation Assay Report'
                  : reportScope === 'po'
                  ? 'Phenoloxidase Kinetic Report'
                  : reportScope === 'compare'
                  ? 'Orthogonal Concordance Report'
                  : 'Comprehensive Assay & Validation Dossier'}
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              <em>Archachatina marginata</em> hemolymph assay · Student research study · &lambda;<sub>coag</sub>={wavelengths.coagulation}nm &bull; &lambda;<sub>PO</sub>={wavelengths.phenoloxidase}nm
            </p>
          </div>
          <div className="text-left sm:text-right space-y-0.5 text-xs">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Run Identifier
            </div>
            <div className="font-semibold text-slate-900 num text-sm">
              {runLabel || 'Run 1'}
            </div>
            <div className="text-slate-500 num">{currentDate}</div>
          </div>
        </header>

        {/* Executive Summary */}
        <section className="bg-indigo-50/60 border-l-4 border-indigo-600 p-4 rounded-r-lg avoid-break print-compact-space">
          <h2 className="text-xs uppercase tracking-wider text-indigo-900 font-bold mb-1 flex items-center gap-1.5 avoid-break-after">
            <FileCheck className="w-4 h-4 text-indigo-600" /> Executive Summary
          </h2>
          <p className="text-xs text-slate-700 leading-relaxed font-normal">
            {generateSummaryText()}
          </p>
        </section>

        {/* SECTION 1: COAGULATION ASSAY (If included) */}
        {showCoagSection && (
          <div className="space-y-6">
            {/* Calibration Statistics */}
            <section className="space-y-3 avoid-break print-compact-space">
              <div className="flex items-center justify-between">
                <h2 className="text-xs uppercase tracking-wider text-indigo-900 font-bold avoid-break-after">
                  {reportScope === 'all' ? '1. ' : ''}Protein Coagulation Calibration Curve Performance
                </h2>
                <span className="text-[11px] font-mono text-slate-500 font-medium">
                  &lambda; = {wavelengths.coagulation} nm
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-white border border-slate-200 rounded-lg text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">
                    R² Coefficient
                  </div>
                  <div className="text-base sm:text-lg font-bold num text-slate-900">
                    {calibration && Number.isFinite(calibration.r2)
                      ? calibration.r2.toFixed(4)
                      : '—'}
                  </div>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">
                    Slope (Sensitivity)
                  </div>
                  <div className="text-base sm:text-lg font-bold num text-slate-900">
                    {calibration
                      ? calibration.type === 'linear'
                        ? calibration.slope?.toFixed(4) ?? '—'
                        : 'quadratic'
                      : '—'}
                  </div>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">
                    Intercept (Blank)
                  </div>
                  <div className="text-base sm:text-lg font-bold num text-slate-900">
                    {calibration
                      ? calibration.type === 'linear'
                        ? calibration.intercept?.toFixed(4) ?? '—'
                        : calibration.c?.toFixed(4) ?? '—'
                      : '—'}
                  </div>
                </div>
              </div>

              <figure className="bg-white border border-slate-200 rounded-xl p-3">
                <PlotlyChart
                  calibration={calibration}
                  sampleResults={results}
                  height={220}
                  isPrintView={true}
                />
                <figcaption className="text-center text-[10px] text-slate-400 mt-1 italic">
                  Figure 1 — Coagulation calibration plot ({wavelengths.coagulation} nm): standards (●), fitted curve, and sample points (◆).
                </figcaption>
              </figure>
            </section>

            {/* Sample Results Table */}
            <section className="space-y-2 avoid-break print-compact-space">
              <h2 className="text-xs uppercase tracking-wider text-indigo-900 font-bold avoid-break-after">
                {reportScope === 'all' ? '2. ' : ''}Commercial IV Fluid Sample Endotoxin Findings (Coagulation)
              </h2>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                      <th className="px-3 py-2">Sample ID</th>
                      <th className="px-3 py-2">Mean Abs ({wavelengths.coagulation}nm)</th>
                      <th className="px-3 py-2">Estimated EU/mL</th>
                      <th className="px-3 py-2">Replicates</th>
                      <th className="px-3 py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-3 py-4 text-slate-400 italic text-center"
                        >
                          No test samples estimated yet.
                        </td>
                      </tr>
                    ) : (
                      results.map((r, i) => {
                        const isAbove =
                          Number.isFinite(r.eu) && r.eu >= threshold;
                        const statusText = r.invalidInput
                          ? 'Invalid input'
                          : r.noSolution
                          ? 'No solution'
                          : r.ambiguous
                          ? 'Ambiguous roots'
                          : r.outOfRange
                          ? 'Extrapolated'
                          : r.negativeEstimate
                          ? 'Negative'
                          : isAbove
                          ? 'Above threshold'
                          : 'Within range';

                        return (
                          <tr key={i} className="avoid-break">
                            <td className="px-3 py-2 font-semibold text-slate-800">
                              {r.name}
                            </td>
                            <td className="px-3 py-2 num">{r.abs.toFixed(4)}</td>
                            <td className="px-3 py-2 num font-bold text-slate-900">
                              {Number.isFinite(r.eu)
                                ? `${r.eu.toFixed(3)} EU/mL`
                                : '—'}
                            </td>
                            <td className="px-3 py-2 text-[11px] text-slate-500 num">
                              {r.n} {r.n === 1 ? 'val' : 'repl'}
                              {r.n > 1 &&
                                Number.isFinite(r.cv) &&
                                ` (CV ${r.cv.toFixed(1)}%)`}
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-[10px] uppercase">
                              <span
                                className={
                                  isAbove || r.invalidInput || r.negativeEstimate
                                    ? 'text-rose-700 font-semibold'
                                    : 'text-slate-700 font-medium'
                                }
                              >
                                {statusText}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* SECTION 2: PHENOLOXIDASE KINETIC ASSAY (If included) */}
        {showPoSection && validKinetic.length > 0 && (
          <section className="space-y-4 avoid-break print-compact-space">
            <div className="flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-wider text-indigo-900 font-bold avoid-break-after flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-indigo-600" />
                {reportScope === 'all' ? '3. ' : ''}Phenoloxidase (PO) Kinetic Rate &amp; Calibration Findings
              </h2>
              <span className="text-[11px] font-mono text-slate-500 font-medium">
                &lambda; = {wavelengths.phenoloxidase} nm
              </span>
            </div>

            {/* PO Summary Metrics if model exists */}
            {kineticModel && (
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-white border border-slate-200 rounded-lg text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">
                    PO Curve R²
                  </div>
                  <div className="text-base sm:text-lg font-bold num text-emerald-700">
                    {kineticModel.r2.toFixed(4)}
                  </div>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">
                    PO Slope (Sensitivity)
                  </div>
                  <div className="text-base sm:text-lg font-bold num text-slate-900">
                    {kineticModel.slope.toFixed(4)}
                  </div>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">
                    PO Intercept (Blank)
                  </div>
                  <div className="text-base sm:text-lg font-bold num text-slate-900">
                    {kineticModel.intercept.toFixed(4)}
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Fraction / Sample</th>
                    <th className="px-3 py-2">Rate (dA/min)</th>
                    <th className="px-3 py-2">Linearity (R²)</th>
                    <th className="px-3 py-2">PO Est. EU/mL</th>
                    <th className="px-3 py-2 text-right">Enzyme Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {validKinetic.map((k) => {
                    const isHigh = k.rate >= 0.01;
                    const isBase = k.rate < 0.001;
                    return (
                      <tr key={k.id} className="avoid-break">
                        <td className="px-3 py-2 uppercase text-[9px] font-bold text-slate-500">
                          {k.type}
                        </td>
                        <td className="px-3 py-2 font-semibold text-slate-800">
                          {k.name}
                        </td>
                        <td className="px-3 py-2 font-mono font-bold text-indigo-700">
                          {k.rate.toFixed(5)}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-700">
                          {Number.isFinite(k.r2) ? k.r2.toFixed(4) : (k.inputMode === 'direct_rate' ? 'Direct' : '—')}
                        </td>
                        <td className="px-3 py-2 font-mono font-bold text-slate-900">
                          {k.type === 'standard'
                            ? `${k.standardEu?.toFixed(3)} EU (Std)`
                            : k.estimatedEu !== undefined &&
                              Number.isFinite(k.estimatedEu)
                            ? `${k.estimatedEu.toFixed(3)} EU/mL`
                            : '—'}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-[10px] uppercase">
                          <span
                            className={
                              isHigh
                                ? 'text-emerald-700 font-semibold'
                                : isBase
                                ? 'text-slate-500 font-normal'
                                : 'text-indigo-700 font-medium'
                            }
                          >
                            {isHigh
                              ? 'High Velocity'
                              : isBase
                              ? 'Baseline'
                              : 'Active'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <figure className="bg-white border border-slate-200 rounded-xl p-3">
                <KineticChart results={validKinetic} height={200} isPrintView={true} />
                <figcaption className="text-center text-[10px] text-slate-400 mt-1 italic">
                  Figure 2A — Absorbance ({wavelengths.phenoloxidase} nm) vs. Reaction Time progress curves.
                </figcaption>
              </figure>

              {kineticModel ? (
                <figure className="bg-white border border-slate-200 rounded-xl p-3">
                  <KineticCalibrationChart
                    model={kineticModel}
                    samples={validKinetic}
                    height={200}
                    isPrintView={true}
                  />
                  <figcaption className="text-center text-[10px] text-slate-400 mt-1 italic">
                    Figure 2B — PO standard calibration curve (Rate vs. EU/mL).
                  </figcaption>
                </figure>
              ) : null}
            </div>
          </section>
        )}

        {/* SECTION 3: DUAL-ASSAY CONCORDANCE COMPARISON (If enabled & available) */}
        {showCompareSection && (
          <section className="space-y-3 avoid-break print-compact-space">
            <h2 className="text-xs uppercase tracking-wider text-indigo-900 font-bold avoid-break-after flex items-center gap-1.5">
              <GitCompare className="w-4 h-4 text-indigo-600" />
              {reportScope === 'all' ? '4. ' : ''}Dual-Assay Orthogonal Cross-Validation (Coagulation vs. Phenoloxidase)
            </h2>
            <DualAssayComparisonSection
              comparisons={comparisons}
              onDownloadCsv={onDownloadComparisonCsv || (() => {})}
              isPrintView={true}
            />
          </section>
        )}

        {/* Signatures Block */}
        <section className="pt-6 border-t-2 border-slate-200 grid grid-cols-2 gap-8 sm:gap-16 avoid-break">
          <div>
            <div className="h-9 border-b border-slate-400"></div>
            <div className="mt-2 text-xs font-bold text-slate-900">
              Student / Analyst Signature
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-tight">
              Name &amp; Date
            </div>
          </div>
          <div>
            <div className="h-9 border-b border-slate-400"></div>
            <div className="mt-2 text-xs font-bold text-slate-900">
              Supervisor Approval
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-tight">
              Name &amp; Date
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-4 text-[10px] text-slate-400 uppercase tracking-widest font-semibold border-t border-slate-100 text-center avoid-break">
          Archachatina marginata Endotoxin Research Suite · Proof-of-concept tool
        </footer>
      </article>
    </div>
  );
};

