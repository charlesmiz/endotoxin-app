import React, { useState } from 'react';
import { CalibrationRow, CalibrationModelFit } from '../types';
import { summarizeReplicates, parseReplicates, mean } from '../utils/math';
import { PlotlyChart } from './PlotlyChart';
import {
  Plus,
  Trash2,
  XCircle,
  MinusCircle,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  Info,
  RotateCcw,
  Sparkles,
  Award,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface StandardCurveTabProps {
  rows: CalibrationRow[];
  setRows: React.Dispatch<React.SetStateAction<CalibrationRow[]>>;
  model: string;
  setModel: (m: string) => void;
  calibration: CalibrationModelFit | null;
  coagWavelength: number;
  setCoagWavelength: (w: number) => void;
  onCompute: () => void;
  onClear: () => void;
  runLabel: string;
  onLoadExample?: () => void;
}

export const StandardCurveTab: React.FC<StandardCurveTabProps> = ({
  rows,
  setRows,
  model,
  setModel,
  calibration,
  coagWavelength,
  setCoagWavelength,
  onCompute,
  onClear,
  runLabel,
  onLoadExample,
}) => {
  const [showAnovaDetails, setShowAnovaDetails] = useState(false);

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      { id: Math.random().toString(), eu: '', abs: '', replicates: '' },
    ]);
  };

  const handleRemoveRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleRowChange = (
    id: string,
    field: 'eu' | 'abs' | 'replicates',
    val: string
  ) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: val };

        if (field === 'replicates') {
          const reps = parseReplicates(val);
          if (reps.length > 0) {
            const calculatedMean = mean(reps);
            if (Number.isFinite(calculatedMean)) {
              updated.abs = calculatedMean.toFixed(4);
            }
          }
          updated.meanReadOnly = false;
        } else if (field === 'abs') {
          updated.meanReadOnly = false;
        }
        return updated;
      })
    );
  };

  const filledPointsCount = rows.filter(
    (r) =>
      r.eu.trim() !== '' &&
      Number.isFinite(parseFloat(r.eu)) &&
      r.abs.trim() !== '' &&
      Number.isFinite(parseFloat(r.abs))
  ).length;

  const hasNegativeValues = rows.some((r) => {
    const eu = parseFloat(r.eu);
    const abs = parseFloat(r.abs);
    return (
      (Number.isFinite(eu) && eu < 0) || (Number.isFinite(abs) && abs < 0)
    );
  });

  const isNegativeSlope =
    calibration &&
    calibration.type === 'linear' &&
    typeof calibration.slope === 'number' &&
    calibration.slope < 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left: Table & Plot */}
        <div className="xl:col-span-8 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/60 gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">
                Coagulation Turbidimetric Standard Curve
              </h2>
              <p className="text-[11px] text-slate-500">
                Endotoxin concentration vs. Endpoint optical density (A<sub>{coagWavelength}nm</sub>)
              </p>
            </div>

            {/* Wavelength selector (documentation only) */}
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs">
                <span>&lambda; (nm):</span>
                <input
                  type="number"
                  value={coagWavelength}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setCoagWavelength(Number.isFinite(val) ? val : 540);
                  }}
                  className="w-14 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-indigo-700 outline-none text-center focus:ring-1 focus:ring-indigo-500"
                  title="Coagulation wavelength in nm (documentation parameter only — pure linear/quadratic regression is applied)"
                />
              </label>
              <span className="text-xs text-slate-400">|</span>
              <span className="text-xs text-slate-500 font-medium">
                {filledPointsCount} point{filledPointsCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 flex-1">
            <div className="p-4 sm:p-5 flex flex-col justify-between">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
                      <th className="text-left pb-2 font-medium">EU/mL</th>
                      <th className="text-left pb-2 font-medium">Abs (OD_{coagWavelength})</th>
                      <th className="text-left pb-2 font-medium">
                        Replicates (optional)
                      </th>
                      <th className="w-6"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td className="py-1.5 pr-2">
                          <input
                            type="number"
                            step="any"
                            placeholder="e.g. 0.5"
                            value={row.eu}
                            onChange={(e) =>
                              handleRowChange(row.id, 'eu', e.target.value)
                            }
                            className="w-full border border-slate-200 bg-slate-50/50 font-mono text-xs text-slate-900 px-2 py-1.5 rounded-md outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            type="number"
                            step="any"
                            placeholder="e.g. 0.048"
                            value={row.abs}
                            onChange={(e) =>
                              handleRowChange(row.id, 'abs', e.target.value)
                            }
                            className="w-full border border-slate-200 bg-slate-50/50 font-mono text-xs text-slate-900 px-2 py-1.5 rounded-md outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            type="text"
                            placeholder="e.g. 0.047, 0.049"
                            value={row.replicates}
                            onChange={(e) =>
                              handleRowChange(
                                row.id,
                                'replicates',
                                e.target.value
                              )
                            }
                            className="w-full border border-slate-200 bg-slate-50/50 font-mono text-xs text-slate-900 px-2 py-1.5 rounded-md outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                          />
                        </td>
                        <td className="py-1.5 text-center">
                          <button
                            onClick={() => handleRemoveRow(row.id)}
                            className="text-slate-400 hover:text-rose-600 transition p-1 rounded cursor-pointer"
                            title="Remove row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleAddRow}
                    className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add row
                  </button>
                  {onLoadExample && (
                    <button
                      onClick={onLoadExample}
                      className="px-3 py-1.5 rounded-md border border-indigo-200 bg-indigo-50/50 text-indigo-700 text-xs font-medium hover:bg-indigo-100/70 transition flex items-center gap-1 cursor-pointer"
                      title="Load example endotoxin standards"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Load Example
                    </button>
                  )}
                  <button
                    onClick={onClear}
                    className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Clear
                  </button>
                  <button
                    onClick={onCompute}
                    className="px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer ml-auto"
                  >
                    Compute Curve
                  </button>
                </div>

                <p className="text-[11px] text-slate-500">
                  Tip: Include a 0 EU/mL blank to establish optical baseline.
                </p>

                <div className="grid grid-cols-1 gap-1.5">
                  <label className="text-[11px] font-medium text-slate-600">
                    Calibration Model Fitting
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="mt-1 w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs bg-white text-slate-800 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="linear">Linear (OLS: y = mx + c)</option>
                      <option value="quadratic">Quadratic (Polynomial: y = ax² + bx + c)</option>
                      <option value="auto">
                        Auto (Automatic Curvature Detection)
                      </option>
                    </select>
                  </label>
                </div>
              </div>
            </div>

            <div className="border-t md:border-t-0 md:border-l border-slate-200 bg-slate-50/30 flex flex-col justify-center p-3">
              <PlotlyChart calibration={calibration} height={300} />
            </div>
          </div>
        </div>

        {/* Right: Fit Quality & ANOVA Card */}
        <div className="xl:col-span-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between overflow-hidden">
          <div>
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">Fit Quality &amp; Statistics</h2>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {runLabel || 'Run 1'}
              </span>
            </div>

            {/* Banner status */}
            <div className="p-4">
              {!calibration ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200/80 text-slate-600 flex items-center justify-center shrink-0">
                    <MinusCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800">
                      No curve yet
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Enter standards and click compute
                    </div>
                  </div>
                </div>
              ) : calibration.type === 'quadratic' ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-amber-900">
                      Exploratory quadratic fit
                    </div>
                    <div className="text-[11px] text-amber-700">
                      Nonlinear model active
                    </div>
                  </div>
                </div>
              ) : calibration.r2 >= 0.9 ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-emerald-900">
                      Strong linear fit
                    </div>
                    <div className="text-[11px] text-emerald-700">
                      R² ≥ 0.90 — excellent fit quality
                    </div>
                  </div>
                </div>
              ) : calibration.r2 >= 0.7 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-amber-900">
                      Moderate linear fit
                    </div>
                    <div className="text-[11px] text-amber-700">
                      Review scatter plot for curvature
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-rose-900">
                      Weak linear fit
                    </div>
                    <div className="text-[11px] text-rose-700">
                      R² &lt; 0.70 — re-check standard readings
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Regression Metrics */}
            <div className="px-5 space-y-2.5">
              <div className="flex items-center justify-between py-0.5">
                <div>
                  <div className="text-xs font-semibold text-slate-800">
                    R² (Coefficient of Determination)
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Linear correlation strength
                  </div>
                </div>
                <span className="text-base font-bold font-mono text-emerald-700">
                  {calibration && Number.isFinite(calibration.r2)
                    ? calibration.r2.toFixed(4)
                    : '—'}
                </span>
              </div>
              <div className="h-px bg-slate-100"></div>

              <div className="flex items-center justify-between py-0.5">
                <div className="text-xs font-medium text-slate-700">Slope (m)</div>
                <span className="text-sm font-bold font-mono text-slate-900">
                  {calibration
                    ? calibration.type === 'linear'
                      ? calibration.slope?.toFixed(4) ?? '—'
                      : 'quadratic'
                    : '—'}
                </span>
              </div>
              <div className="h-px bg-slate-100"></div>

              <div className="flex items-center justify-between py-0.5">
                <div className="text-xs font-medium text-slate-700">
                  Intercept (c)
                </div>
                <span className="text-sm font-bold font-mono text-slate-900">
                  {calibration
                    ? calibration.type === 'linear'
                      ? calibration.intercept?.toFixed(4) ?? '—'
                      : calibration.c?.toFixed(4) ?? '—'
                    : '—'}
                </span>
              </div>
              <div className="h-px bg-slate-100"></div>

              <div className="flex items-center justify-between py-0.5">
                <div className="text-xs font-medium text-slate-700">Equation</div>
                <span className="text-xs font-semibold font-mono text-indigo-700 max-w-[200px] truncate text-right">
                  {calibration
                    ? calibration.type === 'linear'
                      ? `y = ${(calibration.slope ?? 0).toFixed(4)}x ${(calibration.intercept ?? 0) >= 0 ? '+' : '−'} ${Math.abs(calibration.intercept ?? 0).toFixed(4)}`
                      : `y = ${(calibration.a ?? 0).toFixed(4)}x² ${(calibration.b ?? 0) >= 0 ? '+' : '−'} ${Math.abs(calibration.b ?? 0).toFixed(4)}x ${(calibration.c ?? 0) >= 0 ? '+' : '−'} ${Math.abs(calibration.c ?? 0).toFixed(4)}`
                    : '—'}
                </span>
              </div>
            </div>

            {/* Regression ANOVA Sub-Panel */}
            {calibration && calibration.anova && (
              <div className="mx-5 mt-3 border border-slate-200 rounded-lg overflow-hidden bg-slate-50/70">
                <button
                  onClick={() => setShowAnovaDetails(!showAnovaDetails)}
                  className="w-full px-3 py-2 text-xs font-bold text-slate-800 flex items-center justify-between hover:bg-slate-100/70 transition cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 text-indigo-800">
                    <Award className="w-3.5 h-3.5 text-indigo-600" />
                    Regression ANOVA Table
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <span>F = {Number.isFinite(calibration.anova.fStat) ? calibration.anova.fStat.toFixed(2) : '—'}</span>
                    {showAnovaDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                </button>

                {showAnovaDetails && (
                  <div className="p-3 border-t border-slate-200 bg-white text-[11px] space-y-2">
                    <table className="w-full text-[10px] text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                          <th className="pb-1">Source</th>
                          <th className="pb-1">SS</th>
                          <th className="pb-1">df</th>
                          <th className="pb-1">MS</th>
                          <th className="pb-1 text-right">F / p</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                        <tr>
                          <td className="py-1 font-sans font-medium text-slate-800">Regression</td>
                          <td className="py-1">{calibration.anova.ssReg.toFixed(5)}</td>
                          <td className="py-1">{calibration.anova.dfReg}</td>
                          <td className="py-1">{calibration.anova.msReg.toFixed(5)}</td>
                          <td className="py-1 text-right font-bold text-indigo-700">
                            F = {Number.isFinite(calibration.anova.fStat) ? calibration.anova.fStat.toFixed(2) : '—'}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-1 font-sans font-medium text-slate-800">Residual</td>
                          <td className="py-1">{calibration.anova.ssRes.toFixed(5)}</td>
                          <td className="py-1">{calibration.anova.dfRes}</td>
                          <td className="py-1">{calibration.anova.msRes.toFixed(5)}</td>
                          <td className="py-1 text-right text-emerald-700 font-bold">
                            {calibration.anova.pValue < 0.001 ? 'p < 0.001' : `p = ${calibration.anova.pValue.toFixed(3)}`}
                          </td>
                        </tr>
                        <tr className="text-slate-500">
                          <td className="py-1 font-sans font-medium">Total</td>
                          <td className="py-1">{calibration.anova.ssTot.toFixed(5)}</td>
                          <td className="py-1">{calibration.anova.dfTot}</td>
                          <td className="py-1">—</td>
                          <td className="py-1 text-right">—</td>
                        </tr>
                      </tbody>
                    </table>
                    <p className="text-[10px] text-slate-500 italic">
                      ANOVA tests whether the slope is statistically significant ($H_0: m = 0$). Significant $F$-ratio confirms dose-dependent response.
                    </p>
                  </div>
                )}
              </div>
            )}

            {hasNegativeValues && (
              <div className="mx-5 mt-4 p-3 rounded-md bg-amber-50 border border-amber-200 flex items-start gap-2 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Negative EU/mL or absorbance values detected in inputs — verify data entry before relying on estimations.
                </span>
              </div>
            )}

            {isNegativeSlope && (
              <div className="mx-5 mt-3 p-3 rounded-md bg-amber-50 border border-amber-200 flex items-start gap-2 text-xs text-amber-800">
                <TrendingDown className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Fitted slope is negative — absorbance decreases as concentration increases. Check standards data.
                </span>
              </div>
            )}
          </div>

          <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-200 mt-4 flex items-start gap-2 text-[11px] text-slate-500">
            <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              <em>Archachatina marginata</em> hemolymph turbidimetric assay &bull; R² and ANOVA validate standard curve fidelity.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

