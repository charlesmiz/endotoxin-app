import React, { useState } from 'react';
import { SampleRow, SampleEstimateResult, CalibrationModelFit } from '../types';
import { summarizeReplicates, parseReplicates, mean } from '../utils/math';
import {
  Plus,
  Trash2,
  Download,
  Clipboard,
  Calculator,
  Sparkles,
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
  onEstimate,
  onClear,
  onDownloadCsv,
  onLoadExample,
}) => {
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        name: `Sample ${prev.length + 1}`,
        abs: '',
        replicates: '',
      },
    ]);
  };

  const handleRemoveRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleRowChange = (
    id: string,
    field: 'name' | 'abs' | 'replicates',
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
    const newRows: SampleRow[] = [];
    pasteText.trim().split('\n').forEach((line) => {
      const parts = line.split(',');
      if (parts.length >= 2) {
        const name = parts.shift()?.trim() || '';
        const abs = parts.length ? parts.shift()?.trim() || '' : '';
        const reps = parts.join(',').trim();
        newRows.push({
          id: Math.random().toString(),
          name,
          abs,
          replicates: reps,
        });
      }
    });

    if (newRows.length > 0) {
      setRows((prev) => [...prev, ...newRows]);
      setPasteText('');
      setShowPasteBox(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200 bg-slate-50/60">
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">
              Coagulation Sample Estimator
            </h2>
            <p className="text-[11px] text-slate-500">
              Interpolate unknown test infusion endotoxin levels using fitted calibration curve at {coagWavelength} nm
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="font-medium">Pharmacopeial Threshold:</span>
            <input
              type="number"
              step="0.05"
              value={threshold}
              onChange={(e) =>
                setThreshold(parseFloat(e.target.value) || 0)
              }
              className="w-20 font-mono text-xs px-2.5 py-1 border border-slate-200 rounded-md outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 bg-white font-bold text-slate-800"
            />
            <span className="font-semibold text-slate-500">EU/mL</span>
          </div>
        </div>

        {/* Input area */}
        <div className="p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
                  <th className="text-left pb-2 font-medium w-1/3">
                    Sample / Batch Description
                  </th>
                  <th className="text-left pb-2 font-medium w-1/4">
                    Absorbance (OD_{coagWavelength})
                  </th>
                  <th className="text-left pb-2 font-medium w-1/3">
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
                        type="text"
                        placeholder="e.g. 5% Dextrose Infusion"
                        value={row.name}
                        onChange={(e) =>
                          handleRowChange(row.id, 'name', e.target.value)
                        }
                        className="w-full border border-slate-200 bg-slate-50/50 text-xs text-slate-900 px-2 py-1.5 rounded-md outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 focus:bg-white font-medium"
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
                        className="w-full border border-slate-200 bg-slate-50/50 font-mono text-xs text-slate-900 px-2 py-1.5 rounded-md outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
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
                        className="w-full border border-slate-200 bg-slate-50/50 font-mono text-xs text-slate-900 px-2 py-1.5 rounded-md outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                      />
                    </td>
                    <td className="py-1.5 text-center">
                      <button
                        onClick={() => handleRemoveRow(row.id)}
                        className="text-slate-400 hover:text-rose-600 transition p-1 rounded cursor-pointer"
                        title="Remove sample"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={handleAddRow}
              className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add sample
            </button>
            {onLoadExample && (
              <button
                onClick={onLoadExample}
                className="px-3 py-1.5 rounded-md border border-indigo-200 bg-indigo-50/50 text-indigo-700 text-xs font-medium hover:bg-indigo-100/70 transition flex items-center gap-1 cursor-pointer"
                title="Load example test samples"
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
              onClick={() => setShowPasteBox(!showPasteBox)}
              className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer"
            >
              <Clipboard className="w-3.5 h-3.5" /> Paste multiple
            </button>
            <button
              onClick={onEstimate}
              disabled={!calibration}
              className="px-4 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer ml-auto"
            >
              <Calculator className="w-3.5 h-3.5" /> Estimate Concentrations
            </button>
          </div>

          {showPasteBox && (
            <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <p className="text-xs text-slate-600">
                Paste comma-separated rows: <span className="font-mono text-slate-800">Sample Name, Mean Absorbance, Replicates</span>
              </p>
              <textarea
                rows={3}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Sample A, 0.125, 0.124, 0.126&#10;Sample B, 0.045"
                className="w-full text-xs font-mono p-2.5 border border-slate-200 rounded-md outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 bg-white"
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
            <p className="text-[11px] text-amber-700 mt-2 bg-amber-50 p-2.5 rounded-lg border border-amber-200/60 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Note: Compute the calibration curve in Tab 1 first to enable sample estimations.</span>
            </p>
          )}
        </div>

        {/* Results table */}
        <div className="border-t border-slate-200">
          <div className="flex items-center justify-between px-5 py-3 bg-slate-50/60">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Calculated Endotoxin Concentrations &amp; Status Remarks
            </h3>
            <button
              onClick={onDownloadCsv}
              disabled={!results.length}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 text-xs font-medium hover:bg-white transition disabled:opacity-40 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Download CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-y border-slate-200 bg-slate-50/40">
                  <th className="px-5 py-2.5 font-medium">Sample Name</th>
                  <th className="px-5 py-2.5 font-medium">Mean Abs (OD_{coagWavelength})</th>
                  <th className="px-5 py-2.5 font-medium">Estimated EU/mL</th>
                  <th className="px-5 py-2.5 font-medium">Pharmacopeial Compliance &amp; Remarks</th>
                  <th className="px-5 py-2.5 font-medium text-right">Status Badge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-6 text-center text-slate-400 italic text-xs"
                    >
                      No estimated results yet. Click "Estimate Concentrations" above.
                    </td>
                  </tr>
                ) : (
                  results.map((r, idx) => {
                    const isAbove = Number.isFinite(r.eu) && r.eu >= threshold;
                    const euText = Number.isFinite(r.eu)
                      ? r.eu.toFixed(3)
                      : '—';
                    const repText =
                      r.n > 1
                        ? `${r.n} repl · SD ${Number.isFinite(r.sd) ? r.sd.toFixed(4) : '—'} · CV ${Number.isFinite(r.cv) ? r.cv.toFixed(1) + '%' : '—'}`
                        : 'Single reading';

                    return (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3 font-semibold text-slate-800">
                          {r.name}
                        </td>
                        <td className="px-5 py-3 font-mono text-slate-700">
                          {r.abs.toFixed(4)}
                          <div className="text-[10px] text-slate-400 mt-0.5 font-sans font-normal">
                            {repText}
                          </div>
                        </td>
                        <td className="px-5 py-3 font-mono font-bold text-slate-900 text-sm">
                          {euText} <span className="text-[11px] font-sans font-normal text-slate-500">EU/mL</span>
                        </td>
                        <td className="px-5 py-3 text-slate-600 text-xs">
                          {r.remark || (isAbove ? 'Exceeds threshold' : 'Within safety threshold')}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex flex-wrap justify-end gap-1">
                            {r.invalidInput && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800">
                                Invalid input
                              </span>
                            )}
                            {r.outOfRange && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                                Extrapolated
                              </span>
                            )}
                            {r.negativeEstimate && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                                Clamped 0.000 EU
                              </span>
                            )}
                            {r.ambiguous && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800">
                                Ambiguous roots
                              </span>
                            )}
                            {r.noSolution && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800">
                                No range solution
                              </span>
                            )}
                            {!r.invalidInput &&
                              !r.ambiguous &&
                              !r.noSolution && (
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    isAbove
                                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  }`}
                                >
                                  {isAbove
                                    ? 'FLAGGED (> Limit)'
                                    : 'PASS (≤ Limit)'}
                                </span>
                              )}
                          </div>
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
        <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex items-start gap-2.5 text-xs text-slate-600">
          <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <strong>Pharmacopeia Evaluation Standard:</strong> Intravenous infusion solutions (e.g. 0.9% NaCl, 5% Dextrose, Ringer's Lactate) have a maximum permissible endotoxin limit of <strong>0.500 EU/mL</strong> (USP/EP pyrogen limit). Samples flagged above this threshold pose potential endotoxemic pyrogen risk.
          </div>
        </div>
      </div>
    </div>
  );
};

