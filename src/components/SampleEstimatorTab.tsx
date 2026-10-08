import React, { useState, useMemo } from 'react';
import {
  SampleRow,
  PoSampleRow,
  SampleEstimateResult,
  KineticResult,
  CalibrationModelFit,
  KineticCalibrationModel,
  AssayComparisonItem,
  PoInputMode,
  PairingSummary,
  generateRowId,
} from '../types';
import { parseReplicates, mean, getPairKey, computePairingSummary } from '../utils/math';
import {
  Plus,
  Trash2,
  Download,
  Calculator,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sliders,
  Check,
  Split,
  Layers,
} from 'lucide-react';

interface SampleEstimatorTabProps {
  coagRows: SampleRow[];
  setCoagRows: React.Dispatch<React.SetStateAction<SampleRow[]>>;
  poRows: PoSampleRow[];
  setPoRows: React.Dispatch<React.SetStateAction<PoSampleRow[]>>;
  calibration: CalibrationModelFit | null;
  kineticModel: KineticCalibrationModel | null;
  timePoints: number[];
  coagWavelength?: number;
  poWavelength?: number;
  coagResults: SampleEstimateResult[];
  poResults: KineticResult[];
  comparisons?: AssayComparisonItem[];
  pairingSummary?: PairingSummary;
  threshold: number;
  setThreshold: (t: number) => void;
  thresholdBasis?: string;
  setThresholdBasis?: (basis: string) => void;
  onEstimateAll: () => void;
  onEstimateCoag?: () => void;
  onEstimatePo?: () => void;
  onClearAll: () => void;
  onDownloadCsv: () => void;
  onLoadExample?: () => void;
  onGoToConcordance?: () => void;
  onGoToCoagCurve?: () => void;
  onGoToPoCurve?: () => void;
  errorMessage?: string | null;
}

export const SampleEstimatorTab: React.FC<SampleEstimatorTabProps> = ({
  coagRows,
  setCoagRows,
  poRows,
  setPoRows,
  calibration,
  kineticModel,
  timePoints,
  coagWavelength = 540,
  poWavelength = 490,
  coagResults = [],
  poResults = [],
  comparisons = [],
  pairingSummary,
  threshold,
  setThreshold,
  thresholdBasis = 'Investigational study-defined screening cut-off',
  setThresholdBasis,
  onEstimateAll,
  onEstimateCoag,
  onEstimatePo,
  onClearAll,
  onDownloadCsv,
  onLoadExample,
  onGoToConcordance,
  onGoToCoagCurve,
  onGoToPoCurve,
  errorMessage,
}) => {
  const [poMode, setPoMode] = useState<PoInputMode>('series');
  const [layoutView, setLayoutView] = useState<'both' | 'coag' | 'po'>('both');

  const handleSwitchPoMode = (mode: PoInputMode) => {
    setPoMode(mode);
    setPoRows((prev) => prev.map((r) => ({ ...r, inputMode: mode })));
  };

  // Coagulation row handlers
  const handleAddCoagRow = () => {
    setCoagRows((prev) => [
      ...prev,
      {
        id: generateRowId('coag_smp_'),
        sampleId: '',
        name: '',
        abs: '',
        replicates: '',
        dilutionFactor: '',
      },
    ]);
  };

  const handleRemoveCoagRow = (id: string) => {
    if (coagRows.length <= 1) {
      setCoagRows([
        {
          id: generateRowId('coag_smp_'),
          sampleId: '',
          name: '',
          abs: '',
          replicates: '',
          dilutionFactor: '',
        },
      ]);
      return;
    }
    setCoagRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleCoagRowChange = (
    id: string,
    field: keyof SampleRow,
    val: string
  ) => {
    setCoagRows((prev) =>
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
        }
        return updated;
      })
    );
  };

  // Phenoloxidase row handlers
  const handleAddPoRow = () => {
    setPoRows((prev) => [
      ...prev,
      {
        id: generateRowId('po_smp_'),
        sampleId: '',
        name: '',
        directRate: '',
        readings: {},
      },
    ]);
  };

  const handleRemovePoRow = (id: string) => {
    if (poRows.length <= 1) {
      setPoRows([
        {
          id: generateRowId('po_smp_'),
          sampleId: '',
          name: '',
          directRate: '',
          readings: {},
        },
      ]);
      return;
    }
    setPoRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handlePoRowChange = (
    id: string,
    field: keyof PoSampleRow,
    val: string
  ) => {
    setPoRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: val };
        if (field === 'directRate') {
          updated.inputMode = 'direct_rate';
        }
        return updated;
      })
    );
  };

  const handlePoReadingChange = (id: string, time: number, val: string) => {
    setPoRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        return {
          ...row,
          inputMode: 'series',
          readings: {
            ...row.readings,
            [time]: val,
          },
        };
      })
    );
  };

  // Single source of truth pairing summary (from props or computed from rows)
  const activePairingSummary: PairingSummary = useMemo(() => {
    return pairingSummary ?? computePairingSummary(coagRows, poRows);
  }, [pairingSummary, coagRows, poRows]);

  const coagOnlyItems = useMemo(() => {
    return activePairingSummary.coagOnly.map((co) => {
      const result = coagResults.find((r) => getPairKey(r.sampleId, r.name) === co.key);
      return {
        key: co.key,
        name: co.name,
        result,
      };
    });
  }, [activePairingSummary.coagOnly, coagResults]);

  const poOnlyItems = useMemo(() => {
    return activePairingSummary.poOnly.map((po) => {
      const result = poResults.find((r) => r.type === 'sample' && getPairKey(r.sampleId, r.name) === po.key);
      return {
        key: po.key,
        name: po.name,
        result,
      };
    });
  }, [activePairingSummary.poOnly, poResults]);

  const eligibleComparisons = comparisons.filter(
    (c) => c.isEligibleForQuantitativeStats
  );
  const tier1Count = comparisons.filter((c) => c.concordance === 'high').length;
  const discordantCount = comparisons.filter((c) => c.concordance === 'discordant').length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Explanation */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
              <Calculator className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Dual-Assay Sample Estimator
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Independent test tables for Coagulation ({coagWavelength} nm) and Phenoloxidase ({poWavelength} nm). Samples sharing a matching Sample ID are automatically paired for cross-assay concordance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onLoadExample && (
              <button
                onClick={onLoadExample}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-lg transition cursor-pointer"
              >
                Load Example Samples
              </button>
            )}

            <button
              onClick={onClearAll}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 rounded-lg transition flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Clear All
            </button>
          </div>
        </div>

        {/* Calibration Curves Status Bar */}
        <div className="px-5 py-2.5 bg-slate-50/40 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            {/* Coagulation Curve Status */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                1. Coagulation Curve:
              </span>
              {calibration ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <Check className="w-3 h-3" />
                  {calibration.type.toUpperCase()} (R² = {calibration.r2.toFixed(3)})
                </span>
              ) : (
                <button
                  onClick={onGoToCoagCurve}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:underline cursor-pointer"
                >
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  Fit Curve Needed &rarr;
                </button>
              )}
            </div>

            {/* Phenoloxidase Curve Status */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                2. PO Kinetic Curve:
              </span>
              {kineticModel ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                  <Check className="w-3 h-3" />
                  Rate = {kineticModel.slope.toFixed(4)}x {kineticModel.intercept >= 0 ? '+' : '-'} {Math.abs(kineticModel.intercept).toFixed(4)} (R² = {kineticModel.r2.toFixed(3)})
                </span>
              ) : (
                <button
                  onClick={onGoToPoCurve}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:underline cursor-pointer"
                >
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  Fit Curve Needed &rarr;
                </button>
              )}
            </div>
          </div>

          {/* Study Threshold Controls */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              Study Threshold:
            </span>
            <input
              type="number"
              step="0.05"
              min="0"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value) || 0.5)}
              className="w-16 text-center text-xs font-mono font-bold px-1.5 py-0.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
            <span className="text-[10px] text-slate-400">EU/mL</span>
          </div>
        </div>

        {/* View Switcher Bar */}
        <div className="px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setLayoutView('both')}
              className={`px-2.5 py-1 rounded font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                layoutView === 'both'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Split className="w-3.5 h-3.5" /> Both Assays (Independent Tables)
            </button>
            <button
              onClick={() => setLayoutView('coag')}
              className={`px-2.5 py-1 rounded font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                layoutView === 'coag'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Coagulation Only ({coagRows.length})
            </button>
            <button
              onClick={() => setLayoutView('po')}
              className={`px-2.5 py-1 rounded font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                layoutView === 'po'
                  ? 'bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Phenoloxidase Only ({poRows.length})
            </button>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Coagulation: {coagRows.length} sample(s) &bull; Phenoloxidase: {poRows.length} sample(s)
          </div>
        </div>

        {/* The Two Independent Input Tables */}
        <div className="p-5 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* TABLE 1: Coagulation Samples Table */}
            {(layoutView === 'both' || layoutView === 'coag') && (
              <div className="bg-slate-50/50 dark:bg-slate-850 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-4 space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-indigo-100 dark:border-indigo-900/50">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block"></span>
                        Table 1: Coagulation Turbidimetric Samples
                      </h3>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Endpoint absorbance (OD at {coagWavelength} nm)
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                      {coagRows.length} sample(s)
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-700/80 rounded-lg bg-white dark:bg-slate-900">
                    <table className="w-full text-xs text-left border-collapse min-w-[340px]">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-[11px]">
                          <th className="px-2.5 py-2 w-20">Sample ID</th>
                          <th className="px-2.5 py-2">Description</th>
                          <th className="px-2 py-2 text-center w-20">OD ({coagWavelength}nm)</th>
                          <th className="px-2 py-2 text-center w-24">Replicates</th>
                          <th className="px-1.5 py-2 text-center w-12">DF</th>
                          <th className="px-1 py-2 w-7"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {coagRows.map((row, idx) => (
                          <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <td className="p-1">
                              <input
                                type="text"
                                value={row.sampleId ?? ''}
                                onChange={(e) => handleCoagRowChange(row.id, 'sampleId', e.target.value)}
                                placeholder="optional, defaults to name"
                                title="Optional pair ID override (defaults to sample name)"
                                className="w-24 px-1.5 py-1 text-xs font-mono font-bold text-indigo-700 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-850 outline-none focus:border-indigo-500 placeholder:font-normal placeholder:text-[10px] placeholder:text-slate-400"
                              />
                            </td>
                            <td className="p-1">
                              <input
                                type="text"
                                value={row.name}
                                onChange={(e) => handleCoagRowChange(row.id, 'name', e.target.value)}
                                placeholder="e.g. Infusion A"
                                className="w-full px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                              />
                            </td>
                            <td className="p-1 text-center">
                              <input
                                type="number"
                                step="any"
                                value={row.abs}
                                onChange={(e) => handleCoagRowChange(row.id, 'abs', e.target.value)}
                                placeholder="0.082"
                                className="w-16 text-center px-1 py-1 text-xs font-mono font-bold border border-indigo-200 dark:border-indigo-800 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                              />
                            </td>
                            <td className="p-1 text-center">
                              <input
                                type="text"
                                value={row.replicates ?? ''}
                                onChange={(e) => handleCoagRowChange(row.id, 'replicates', e.target.value)}
                                placeholder="opt"
                                className="w-20 text-center px-1 py-1 text-[11px] font-mono border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                              />
                            </td>
                            <td className="p-1 text-center">
                              <input
                                type="number"
                                step="1"
                                min="1"
                                value={row.dilutionFactor ?? '1'}
                                onChange={(e) => handleCoagRowChange(row.id, 'dilutionFactor', e.target.value)}
                                placeholder="1"
                                className="w-10 text-center px-1 py-1 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                              />
                            </td>
                            <td className="p-1 text-center">
                              <button
                                onClick={() => handleRemoveCoagRow(row.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                                title="Delete row"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={handleAddCoagRow}
                      className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 rounded-md flex items-center gap-1 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Coag Sample
                    </button>
                    {onEstimateCoag && (
                      <button
                        onClick={onEstimateCoag}
                        className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                      >
                        Estimate Coag Only
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TABLE 2: Phenoloxidase Samples Table */}
            {(layoutView === 'both' || layoutView === 'po') && (
              <div className="bg-slate-50/50 dark:bg-slate-850 border border-violet-100 dark:border-violet-900/50 rounded-xl p-4 space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-violet-100 dark:border-violet-900/50">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-violet-950 dark:text-violet-200 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-violet-600 inline-block"></span>
                        Table 2: Phenoloxidase Kinetic Samples
                      </h3>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Enzymatic rate measurements at {poWavelength} nm
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-300 mr-1">
                        {poRows.length} sample(s)
                      </span>
                      <div className="flex items-center bg-white dark:bg-slate-800 p-0.5 rounded border border-slate-200 dark:border-slate-700 text-[10px]">
                        <button
                          onClick={() => handleSwitchPoMode('series')}
                          className={`px-1.5 py-0.5 rounded font-medium ${
                            poMode === 'series'
                              ? 'bg-violet-600 text-white font-bold'
                              : 'text-slate-500'
                          }`}
                        >
                          Series
                        </button>
                        <button
                          onClick={() => handleSwitchPoMode('direct_rate')}
                          className={`px-1.5 py-0.5 rounded font-medium ${
                            poMode === 'direct_rate'
                              ? 'bg-violet-600 text-white font-bold'
                              : 'text-slate-500'
                          }`}
                        >
                          Direct Rate
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-700/80 rounded-lg bg-white dark:bg-slate-900">
                    <table className="w-full text-xs text-left border-collapse min-w-[340px]">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-[11px]">
                          <th className="px-2.5 py-2 w-20">Sample ID</th>
                          <th className="px-2.5 py-2">Description</th>
                          {poMode === 'series' ? (
                            timePoints.map((t) => (
                              <th key={t} className="px-1 py-2 text-center whitespace-nowrap font-mono text-[10px]">
                                {t}m
                              </th>
                            ))
                          ) : (
                            <th className="px-2 py-2 text-center w-28 font-bold text-violet-800 dark:text-violet-300">
                              dA/dt (OD/min)
                            </th>
                          )}
                          <th className="px-1 py-2 w-7"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {poRows.map((row, idx) => (
                          <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <td className="p-1">
                              <input
                                type="text"
                                value={row.sampleId ?? ''}
                                onChange={(e) => handlePoRowChange(row.id, 'sampleId', e.target.value)}
                                placeholder="optional, defaults to name"
                                title="Optional pair ID override (defaults to sample name)"
                                className="w-24 px-1.5 py-1 text-xs font-mono font-bold text-violet-700 dark:text-violet-400 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-850 outline-none focus:border-violet-500 placeholder:font-normal placeholder:text-[10px] placeholder:text-slate-400"
                              />
                            </td>
                            <td className="p-1">
                              <input
                                type="text"
                                value={row.name}
                                onChange={(e) => handlePoRowChange(row.id, 'name', e.target.value)}
                                placeholder="e.g. Infusion A"
                                className="w-full px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                              />
                            </td>

                            {poMode === 'series' ? (
                              timePoints.map((t) => (
                                <td key={t} className="p-1 text-center">
                                  <input
                                    type="number"
                                    step="0.001"
                                    value={row.readings[t] ?? ''}
                                    onChange={(e) => handlePoReadingChange(row.id, t, e.target.value)}
                                    placeholder="0.00"
                                    className="w-12 text-center px-0.5 py-1 text-[11px] font-mono border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                                  />
                                </td>
                              ))
                            ) : (
                              <td className="p-1 text-center">
                                <input
                                  type="number"
                                  step="0.0001"
                                  value={row.directRate ?? ''}
                                  onChange={(e) => handlePoRowChange(row.id, 'directRate', e.target.value)}
                                  placeholder="0.0085"
                                  className="w-24 text-center px-1.5 py-1 text-xs font-mono font-bold border border-violet-200 dark:border-violet-800 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                                />
                              </td>
                            )}

                            <td className="p-1 text-center">
                              <button
                                onClick={() => handleRemovePoRow(row.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                                title="Delete row"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={handleAddPoRow}
                      className="text-xs font-semibold text-violet-700 dark:text-violet-300 hover:text-violet-900 bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-800 px-2.5 py-1 rounded-md flex items-center gap-1 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add PO Sample
                    </button>
                    {onEstimatePo && (
                      <button
                        onClick={onEstimatePo}
                        className="text-xs font-semibold text-violet-600 hover:underline cursor-pointer"
                      >
                        Estimate PO Only
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error / Validation Feedback */}
          {errorMessage && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <div className="flex items-center gap-2">
                {!calibration && onGoToCoagCurve && (
                  <button
                    onClick={onGoToCoagCurve}
                    className="px-2.5 py-1 font-bold text-xs bg-white dark:bg-slate-800 rounded border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:underline cursor-pointer"
                  >
                    1. Fit Coag Curve
                  </button>
                )}
                {!kineticModel && onGoToPoCurve && (
                  <button
                    onClick={onGoToPoCurve}
                    className="px-2.5 py-1 font-bold text-xs bg-white dark:bg-slate-800 rounded border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:underline cursor-pointer"
                  >
                    2. Fit PO Curve
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Master Estimation Action Bar */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={onEstimateAll}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Calculator className="w-4 h-4" />
              Estimate Unknown Concentrations (Both Assays)
            </button>

            {onGoToConcordance && comparisons.length > 0 && (
              <button
                onClick={onGoToConcordance}
                className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>View Full Deming &amp; Bland–Altman Analysis</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RESULTS SECTION: Matched Pairs vs Single-Assay Only */}
      {(coagResults.length > 0 || poResults.length > 0) && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Estimation Results &amp; Cross-Assay Concordance
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Samples sharing identical Sample IDs are matched as cross-assay pairs. Unmatched samples are reported as single-assay.
              </p>
            </div>

            {onDownloadCsv && (
              <button
                onClick={onDownloadCsv}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                Export Results CSV
              </button>
            )}
          </div>

          {/* Pairing Summary Banner */}
          <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="font-semibold text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
              <Split className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>
                {activePairingSummary.uniqueCount} unique samples: {activePairingSummary.pairedCount} paired, {activePairingSummary.coagOnly.length} coagulation-only, {activePairingSummary.poOnly.length} PO-only
                {activePairingSummary.enteredWithoutValue.length > 0 ? `, ${activePairingSummary.enteredWithoutValue.length} entered without a value` : ''}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Matched strictly by sample name (or optional Pair ID)
            </span>
          </div>

          {/* Warnings: Duplicate Keys or Possible Typo Matches */}
          {activePairingSummary.duplicateKeys.length > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg text-xs space-y-1 text-amber-900 dark:text-amber-200">
              <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                Duplicate Sample Identifier Detected
              </div>
              {activePairingSummary.duplicateKeys.map((dup, i) => (
                <div key={i} className="text-[11px]">
                  &bull; Duplicate key &quot;<strong>{dup.key}</strong>&quot; in {dup.assay} across {dup.rows.length} rows ({dup.rows.join(', ')}). Duplicate-keyed samples cannot be uniquely paired.
                </div>
              ))}
            </div>
          )}

          {activePairingSummary.possibleMatches.length > 0 && (
            <div className="p-3 bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 rounded-lg text-xs space-y-1 text-sky-900 dark:text-sky-200">
              <div className="font-bold flex items-center gap-1.5 text-sky-800 dark:text-sky-300">
                <Split className="w-4 h-4 text-sky-600 shrink-0" />
                Possible Naming Discrepancy (Unpaired Samples)
              </div>
              {activePairingSummary.possibleMatches.map((m, i) => (
                <div key={i} className="text-[11px]">
                  &bull; &quot;<strong>{m.coagName}</strong>&quot; (Coagulation) and &quot;<strong>{m.poName}</strong>&quot; (Phenoloxidase) differ by a minor edit distance (possible typo). Verify spelling if these represent the same sample.
                </div>
              ))}
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">
                Total Unique Samples
              </span>
              <span className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
                {activePairingSummary.uniqueCount}
              </span>
              <span className="text-[10px] text-slate-400">
                across both assays
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[10px] text-indigo-500 uppercase font-bold block mb-0.5">
                Matched Pairs
              </span>
              <span className="text-lg font-bold font-mono text-indigo-700 dark:text-indigo-300">
                {activePairingSummary.pairedCount}
              </span>
              <span className="text-[10px] text-slate-400">
                {eligibleComparisons.length} quantifiable
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[10px] text-emerald-600 uppercase font-bold block mb-0.5">
                Tier 1 Agreement (≤15%)
              </span>
              <span className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-300">
                {tier1Count}
              </span>
              <span className="text-[10px] text-slate-400">
                high concordance
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[10px] text-rose-500 uppercase font-bold block mb-0.5">
                Single-Assay Only
              </span>
              <span className="text-lg font-bold font-mono text-slate-700 dark:text-slate-300">
                {activePairingSummary.coagOnly.length + activePairingSummary.poOnly.length}
              </span>
              <span className="text-[10px] text-slate-400">
                {activePairingSummary.coagOnly.length} Coag only &bull; {activePairingSummary.poOnly.length} PO only
              </span>
            </div>
          </div>

          {/* SECTION 1: Matched Cross-Assay Pairs */}
          {comparisons.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Cross-Assay Matched Pairs ({comparisons.length} sample pairs sharing Sample ID)
              </h4>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-[11px]">
                      <th className="px-3 py-2.5">Sample ID &amp; Name</th>
                      <th className="px-3 py-2.5 text-center font-bold text-indigo-900 dark:text-indigo-300 border-l border-slate-200 dark:border-slate-800">
                        Coagulation EU/mL
                      </th>
                      <th className="px-3 py-2.5 text-center font-bold text-violet-900 dark:text-violet-300 border-l border-slate-200 dark:border-slate-800">
                        Phenoloxidase EU/mL
                      </th>
                      <th className="px-3 py-2.5 text-center font-bold text-slate-800 dark:text-slate-200 border-l border-slate-200 dark:border-slate-800">
                        |ΔEU|
                      </th>
                      <th className="px-3 py-2.5 text-center font-bold text-slate-800 dark:text-slate-200">
                        RPD (%)
                      </th>
                      <th className="px-3 py-2.5 text-center">Concordance Tier</th>
                      <th className="px-3 py-2.5">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {comparisons.map((cmp) => {
                      const isHigh = cmp.concordance === 'high';
                      const isMod = cmp.concordance === 'moderate';
                      const isDisc = cmp.concordance === 'discordant';
                      const isExcluded = cmp.agreement === 'EXCLUDED';

                      return (
                        <tr key={cmp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                          <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                            <span className="font-mono text-[11px] font-bold text-indigo-700 dark:text-indigo-400 mr-1.5">
                              [{cmp.sampleId}]
                            </span>
                            <span>{cmp.name}</span>
                          </td>

                          {/* Coagulation */}
                          <td className="px-3 py-2.5 text-center font-mono border-l border-slate-200 dark:border-slate-800">
                            {cmp.coagEu !== null && Number.isFinite(cmp.coagEu) ? (
                              <div>
                                <span className="font-bold text-indigo-900 dark:text-indigo-300 text-sm">
                                  {cmp.coagEu.toFixed(3)}
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  ({Number.isFinite(cmp.coagAbs) ? cmp.coagAbs.toFixed(3) : '—'} OD)
                                </span>
                              </div>
                            ) : (
                              <span className="text-amber-600 font-semibold text-[11px]">
                                {cmp.coagStatus || '< LOD'}
                              </span>
                            )}
                          </td>

                          {/* Phenoloxidase */}
                          <td className="px-3 py-2.5 text-center font-mono border-l border-slate-200 dark:border-slate-800">
                            {cmp.poEu !== null && Number.isFinite(cmp.poEu) ? (
                              <div>
                                <span className="font-bold text-violet-900 dark:text-violet-300 text-sm">
                                  {cmp.poEu.toFixed(3)}
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  ({Number.isFinite(cmp.poRate) ? cmp.poRate.toFixed(4) : '—'}/min)
                                </span>
                              </div>
                            ) : (
                              <span className="text-amber-600 font-semibold text-[11px]">
                                {cmp.poStatus || 'N/A'}
                              </span>
                            )}
                          </td>

                          {/* Absolute Difference */}
                          <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800 dark:text-slate-200 border-l border-slate-200 dark:border-slate-800">
                            {cmp.absDiff !== null && Number.isFinite(cmp.absDiff)
                              ? cmp.absDiff.toFixed(4)
                              : '—'}
                          </td>

                          {/* RPD */}
                          <td className="px-3 py-2.5 text-center font-mono font-bold">
                            {cmp.rpd !== null && Number.isFinite(cmp.rpd) ? (
                              <span
                                className={
                                  isHigh
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : isMod
                                    ? 'text-amber-700 dark:text-amber-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }
                              >
                                {cmp.rpd.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* Tier Badge */}
                          <td className="px-3 py-2.5 text-center whitespace-nowrap">
                            {isExcluded ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                EXCLUDED
                              </span>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  isHigh
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : isMod
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300'
                                    : 'bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300'
                                }`}
                              >
                                {isHigh ? (
                                  <CheckCircle2 className="w-3 h-3" />
                                ) : (
                                  <AlertTriangle className="w-3 h-3" />
                                )}
                                {isHigh
                                  ? 'Tier 1 (≤15%)'
                                  : isMod
                                  ? 'Tier 2 (≤25%)'
                                  : 'Discordant (>25%)'}
                              </span>
                            )}
                          </td>

                          <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400 text-[11px] leading-snug min-w-[200px]">
                            {cmp.comment}
                            {cmp.lowConcentrationWarning && (
                              <div className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
                                {cmp.lowConcentrationWarning}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION 2: Single-Assay Only Samples & Entered Without Value */}
          {(activePairingSummary.coagOnly.length > 0 || activePairingSummary.poOnly.length > 0 || activePairingSummary.enteredWithoutValue.length > 0) && (
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-slate-500" />
                Single-Assay &amp; Unpaired Samples ({activePairingSummary.coagOnly.length + activePairingSummary.poOnly.length} tested in one method only)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Coagulation-only */}
                {activePairingSummary.coagOnly.length > 0 && (
                  <div className="border border-indigo-100 dark:border-indigo-900/50 rounded-lg p-3 bg-indigo-50/20 dark:bg-indigo-950/20 space-y-2">
                    <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-300 uppercase block">
                      Tested on Coagulation Only ({activePairingSummary.coagOnly.length})
                    </span>
                    <div className="space-y-1.5">
                      {coagOnlyItems.map((c) => (
                        <div
                          key={c.key}
                          className="flex items-center justify-between p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{c.name}</span>
                            <span className="text-[10px] text-slate-400 block">Coagulation only</span>
                          </div>
                          <div className="text-right font-mono">
                            {c.result ? (
                              <>
                                <span className="font-bold text-indigo-900 dark:text-indigo-300">
                                  {c.result.reportedEu !== null && Number.isFinite(c.result.reportedEu)
                                    ? `${(c.result.reportedEu * c.result.dilutionFactor).toFixed(3)} EU/mL`
                                    : c.result.reportableText}
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  Not tested in PO
                                </span>
                              </>
                            ) : (
                              <span className="text-[11px] text-slate-400">Coagulation only</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Phenoloxidase-only */}
                {activePairingSummary.poOnly.length > 0 && (
                  <div className="border border-violet-100 dark:border-violet-900/50 rounded-lg p-3 bg-violet-50/20 dark:bg-violet-950/20 space-y-2">
                    <span className="text-[11px] font-bold text-violet-900 dark:text-violet-300 uppercase block">
                      Tested on Phenoloxidase Only ({activePairingSummary.poOnly.length})
                    </span>
                    <div className="space-y-1.5">
                      {poOnlyItems.map((p) => (
                        <div
                          key={p.key}
                          className="flex items-center justify-between p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{p.name}</span>
                            <span className="text-[10px] text-slate-400 block">PO only</span>
                          </div>
                          <div className="text-right font-mono">
                            {p.result ? (
                              <>
                                <span className="font-bold text-violet-900 dark:text-violet-300">
                                  {p.result.reportedEu !== null && Number.isFinite(p.result.reportedEu)
                                    ? `${p.result.reportedEu.toFixed(3)} EU/mL`
                                    : p.result.reportableText}
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  Not tested in Coag
                                </span>
                              </>
                            ) : (
                              <span className="text-[11px] text-slate-400">PO only</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Rows entered without a measured value */}
              {activePairingSummary.enteredWithoutValue.length > 0 && (
                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                  <div className="font-bold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wide">
                    Samples Entered Without Measured Value ({activePairingSummary.enteredWithoutValue.length})
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {activePairingSummary.enteredWithoutValue.map((item, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-[11px]"
                      >
                        <strong>{item.name}</strong>: entered without a value in {item.assay}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
