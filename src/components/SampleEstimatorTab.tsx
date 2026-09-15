import React, { useState } from 'react';
import { SampleRow, SampleEstimateResult, CalibrationModelFit } from '../types';
import { summarizeReplicates, parseReplicates, parseReplicatesDetailed, mean } from '../utils/math';
import { parseSampleCsvImport } from '../utils/csv';
import {
  Plus,
  Trash2,
  Download,
  Clipboard,
  Calculator,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sliders,
} from 'lucide-react';

interface SampleEstimatorTabProps {
  rows: SampleRow[];
  setRows: React.Dispatch<React.SetStateAction<SampleRow[]>>;
  calibration: CalibrationModelFit | null;
  coagWavelength?: number;
  results: SampleEstimateResult[];
  threshold: number;
  setThreshold: (t: number) => void;
  thresholdBasis?: string;
  setThresholdBasis?: (basis: string) => void;
  onEstimate: () => void;
  onClear: () => void;
  onDownloadCsv: () => void;
  onLoadExample?: () => void;
}

export const SampleEstimatorTab: React.FC<SampleEstimatorTabProps> = ({
  rows,
  setRows,
  calibration,
  coagWavelength = 545,
  results,
  threshold,
  setThreshold,
  thresholdBasis = 'Investigational study-defined screening cut-off',
  setThresholdBasis,
  onEstimate,
  onClear,
  onDownloadCsv,
  onLoadExample,
}) => {
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const handleAddRow = () => {
    const nextIdx = rows.length + 1;
    setRows((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        sampleId: `S${nextIdx}`,
        name: `Sample ${nextIdx}`,
        abs: '',
        replicates: '',
        dilutionFactor: '1',
      },
    ]);
  };

  const handleRemoveRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleRowChange = (
    id: string,
    field: 'name' | 'abs' | 'replicates' | 'sampleId' | 'dilutionFactor',
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

  const handleImportPaste = () => {
    if (!pasteText.trim()) return;
    const newRows = parseSampleCsvImport(pasteText, rows.length);
    if (newRows.length > 0) {
      setRows((prev) => [...prev, ...newRows]);
      setPasteText('');
      setShowPasteBox(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Header bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">
              Coagulation Sample Estimator
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Interpolate unknown test infusion endotoxin levels using fitted calibration curve at {coagWavelength} nm
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-slate-700 dark:text-slate-300">Study-defined decision threshold:</span>
              <input
                type="number"
                step="0.05"
                value={threshold}
                onChange={(e) =>
                  setThreshold(parseFloat(e.target.value) || 0)
                }
                className="w-20 font-mono text-xs px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-md outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-100"
              />
              <span className="font-semibold text-slate-500 dark:text-slate-400">EU/mL</span>
            </div>
            {setThresholdBasis && (
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-slate-700 dark:text-slate-300">Basis / Protocol:</span>
                <input
                  type="text"
                  value={thresholdBasis}
                  onChange={(e) => setThresholdBasis(e.target.value)}
                  placeholder="e.g. Investigational screening cut-off"
                  className="w-56 text-xs px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-md outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>
            )}
          </div>
        </div>

        {/* Input area */}
        <div className="p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <th className="text-left pb-2 font-medium w-24">
                    Sample ID
                  </th>
                  <th className="text-left pb-2 font-medium">
                    Sample / Batch Description
                  </th>
                  <th className="text-left pb-2 font-medium w-28">
                    Absorbance ({coagWavelength}nm)
                  </th>
                  <th className="text-left pb-2 font-medium w-40">
                    Replicates (optional)
                  </th>
                  <th className="text-left pb-2 font-medium w-20">
                    DF
                  </th>
                  <th className="w-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((row, idx) => {
                  const detailed = parseReplicatesDetailed(row.replicates);
                  const hasInvalidTokens = detailed.invalidTokens.length > 0;

                  return (
                    <tr key={row.id}>
                      <td className="py-1.5 pr-2">
                        <input
                          type="text"
                          placeholder={`S${idx + 1}`}
                          value={row.sampleId ?? `S${idx + 1}`}
                          onChange={(e) =>
                            handleRowChange(row.id, 'sampleId', e.target.value)
                          }
                          className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850 text-xs font-mono font-bold text-indigo-700 dark:text-indigo-400 px-2 py-1.5 rounded-md outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input
                          type="text"
                          placeholder="e.g. 5% Dextrose Infusion"
                          value={row.name}
                          onChange={(e) =>
                            handleRowChange(row.id, 'name', e.target.value)
                          }
                          className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850 text-xs text-slate-900 dark:text-slate-100 px-2 py-1.5 rounded-md outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 font-medium"
                        />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input
                          type="number"
                          step="any"
                          placeholder="e.g. 0.082"
                          value={row.abs}
                          onChange={(e) =>
                            handleRowChange(row.id, 'abs', e.target.value)
                          }
                          className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850 font-mono text-xs text-slate-900 dark:text-slate-100 px-2 py-1.5 rounded-md outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800"
                        />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input
                          type="text"
                          placeholder="e.g. 0.081, 0.083"
                          value={row.replicates}
                          onChange={(e) =>
                            handleRowChange(row.id, 'replicates', e.target.value)
                          }
                          className={`w-full border ${hasInvalidTokens ? 'border-amber-400 dark:border-amber-600' : 'border-slate-200 dark:border-slate-700'} bg-slate-50/50 dark:bg-slate-850 font-mono text-xs text-slate-900 dark:text-slate-100 px-2 py-1.5 rounded-md outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800`}
                        />
                        {hasInvalidTokens && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-0.5">
                            Ignored: {detailed.invalidTokens.join(', ')}
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 pr-2">
                        <input
                          type="number"
                          step="any"
                          min="1"
                          placeholder="1"
                          value={row.dilutionFactor ?? '1'}
                          onChange={(e) =>
                            handleRowChange(row.id, 'dilutionFactor', e.target.value)
                          }
                          className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850 font-mono text-xs text-slate-900 dark:text-slate-100 px-2 py-1.5 rounded-md outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 text-center"
                          title="Dilution factor (e.g. 10 for 1:10 dilution)"
                        />
                      </td>
                      <td className="py-1.5 text-center">
                        <button
                          onClick={() => handleRemoveRow(row.id)}
                          className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition p-1 rounded cursor-pointer"
                          title="Remove sample"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleAddRow}
              className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add sample
            </button>
            {onLoadExample && (
              <button
                onClick={onLoadExample}
                className="px-3 py-1.5 rounded-md border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-medium hover:bg-indigo-100/70 dark:hover:bg-indigo-900/60 transition shadow-2xs cursor-pointer"
                title="Load example test samples"
              >
                Load Example
              </button>
            )}
            <button
              onClick={onClear}
              className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Clear
            </button>
            <button
              onClick={() => setShowPasteBox(!showPasteBox)}
              className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer"
            >
              <Clipboard className="w-3.5 h-3.5" /> Paste multiple
            </button>
            <button
              onClick={onEstimate}
              disabled={!calibration}
              className="px-4 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer ml-auto"
            >
              <Calculator className="w-3.5 h-3.5" /> Estimate Concentrations
            </button>
          </div>

          {showPasteBox && (
            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Paste comma-separated rows: <span className="font-mono text-slate-800 dark:text-slate-200">Sample Name, Mean Absorbance, Replicates</span>
              </p>
              <textarea
                rows={3}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Sample A, 0.125, 0.124, 0.126&#10;Sample B, 0.045"
                className="w-full text-xs font-mono p-2.5 border border-slate-200 dark:border-slate-700 rounded-md outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
              <button
                onClick={handleImportPaste}
                className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium cursor-pointer"
              >
                Import rows
              </button>
            </div>
          )}

          {!calibration && (
            <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-2 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-900/60 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Note: Compute the calibration curve in Tab 1 first to enable sample estimations.</span>
            </p>
          )}
        </div>

        {/* Results table */}
        <div className="border-t border-slate-200 dark:border-slate-800">
          <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 border-b border-amber-200/60 dark:border-amber-900/50 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Persistent Research Notice:</strong> Archachatina marginata bioassay data are analyzed for investigational and research purposes only. This tool evaluates sample readings against study-configured parameters and does not establish clinical, regulatory, pharmacopeial, product-release, or patient-safety conclusions.
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-50/60 dark:bg-slate-800/60">
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Calculated Endotoxin Concentrations &amp; Analytical Evaluation
              </h3>
              {calibration && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Active Calibration Standards Range:{' '}
                  <span className="font-mono font-semibold text-indigo-700 dark:text-indigo-400">
                    {calibration.xMin.toFixed(3)} – {calibration.xMax.toFixed(3)} EU/mL
                  </span>{' '}
                  ({calibration.type.toUpperCase()}, R&sup2; = {calibration.r2.toFixed(4)})
                </div>
              )}
            </div>
            <button
              onClick={onDownloadCsv}
              disabled={!results.length}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-white dark:hover:bg-slate-800 transition disabled:opacity-40 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Download Research CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-y border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40">
                  <th className="px-4 py-2.5 font-medium">Sample ID &amp; Name</th>
                  <th className="px-4 py-2.5 font-medium">Mean Abs ({coagWavelength}nm Doc)</th>
                  <th className="px-4 py-2.5 font-medium">Estimated Concentration</th>
                  <th className="px-4 py-2.5 font-medium">Analytical Validity &amp; Range</th>
                  <th className="px-4 py-2.5 font-medium">Study Threshold Decision</th>
                  <th className="px-4 py-2.5 font-medium">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {results.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-6 text-center text-slate-400 italic text-xs"
                    >
                      No estimated results yet. Click "Estimate Concentrations" above.
                    </td>
                  </tr>
                ) : (
                  results.map((r, idx) => {
                    const repText =
                      r.n > 1
                        ? `${r.n} repl · SD ${Number.isFinite(r.sd) ? r.sd.toFixed(4) : '—'} · CV ${Number.isFinite(r.cv) ? r.cv.toFixed(1) + '%' : '—'}`
                        : 'Single reading';

                    let rangeLabel = 'Interpolated (In Cal Range)';
                    let rangeBadgeClass = 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';

                    if (r.analyticalStatus === 'BELOW_BLANK') {
                      rangeLabel = 'Below Blank (< LOD)';
                      rangeBadgeClass = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';
                    } else if (r.analyticalStatus === 'OUT_OF_RANGE') {
                      rangeLabel = 'Extrapolated (> Cal Upper)';
                      rangeBadgeClass = 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700';
                    } else if (r.analyticalStatus === 'INVALID_INPUT' || r.invalidInput) {
                      rangeLabel = 'Invalid Reading';
                      rangeBadgeClass = 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800';
                    } else if (r.analyticalStatus === 'AMBIGUOUS' || r.ambiguous) {
                      rangeLabel = 'Ambiguous Multi-Root';
                      rangeBadgeClass = 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800';
                    }

                    return (
                      <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100">
                          <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 mr-1.5">[{r.sampleId}]</span>
                          {r.name}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">
                          {r.abs.toFixed(4)}
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-sans font-normal">
                            {repText}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {r.reportedEu !== null && Number.isFinite(r.reportedEu) ? (
                            <div>
                              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                                {r.reportedEu.toFixed(3)}
                              </span>{' '}
                              <span className="text-[11px] font-sans font-normal text-slate-500 dark:text-slate-400">EU/mL</span>
                              {r.dilutionFactor > 1 && (
                                <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-sans mt-0.5">
                                  DF {r.dilutionFactor}× (raw: {r.originalConcentration?.toFixed(3)} EU/mL)
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="font-bold text-amber-700 dark:text-amber-400 text-xs font-mono">
                              {r.reportableText}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${rangeBadgeClass}`}>
                            {rangeLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              r.compliance === 'PASS'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : r.compliance === 'FLAGGED'
                                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            {r.compliance === 'PASS'
                              ? `Below Study Threshold (≤ ${threshold.toFixed(3)} EU/mL)`
                              : r.compliance === 'FLAGGED'
                              ? `Above Study Threshold (> ${threshold.toFixed(3)} EU/mL)`
                              : 'Inconclusive / Review'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs">
                          {r.remark}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Status Guide Footer Card */}
        <div className="p-4 bg-slate-50/80 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
          <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <strong>Study Threshold Protocol Notice:</strong> Endotoxin decision thresholds are study-defined parameters and depend on the specific formulation, route, and research protocol. This investigational analysis software evaluates sample readings against the configured study decision threshold. It does not establish clinical, regulatory, pharmacopeial, product-release, or patient-safety conclusions.
          </div>
        </div>
      </div>
    </div>
  );
};

