import React, { useState } from 'react';
import {
  PoStandardRow,
  KineticCalibrationModel,
  KineticResult,
  PoInputMode,
} from '../types';
import { KineticChart } from './KineticChart';
import { KineticCalibrationChart } from './KineticCalibrationChart';
import {
  Activity,
  TrendingUp,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  ArrowRight,
  Download,
} from 'lucide-react';

interface PhenoloxidaseCurveTabProps {
  timePoints: number[];
  setTimePoints: (pts: number[]) => void;
  rows: PoStandardRow[];
  setRows: React.Dispatch<React.SetStateAction<PoStandardRow[]>>;
  model: KineticCalibrationModel | null;
  standardResults: KineticResult[];
  poWavelength?: number;
  setPoWavelength?: (w: number) => void;
  onCompute: () => void;
  onClear: () => void;
  onLoadExample?: () => void;
  onDownloadCsv?: () => void;
  onGoToEstimator?: () => void;
  errorMessage?: string | null;
}

export const PhenoloxidaseCurveTab: React.FC<PhenoloxidaseCurveTabProps> = ({
  timePoints,
  setTimePoints,
  rows,
  setRows,
  model,
  standardResults,
  poWavelength = 490,
  setPoWavelength,
  onCompute,
  onClear,
  onLoadExample,
  onDownloadCsv,
  onGoToEstimator,
  errorMessage,
}) => {
  const [inputMode, setInputMode] = useState<PoInputMode>('series');
  const [timePointsInput, setTimePointsInput] = useState(timePoints.join(', '));
  const [isEditingTimes, setIsEditingTimes] = useState(false);
  const [chartView, setChartView] = useState<'progress' | 'cal'>('cal');

  const handleSwitchMode = (mode: PoInputMode) => {
    setInputMode(mode);
    setRows((prev) => prev.map((r) => ({ ...r, inputMode: mode })));
  };

  const handleUpdateStandardEu = (id: string, val: string) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, standardEu: val } : row))
    );
  };

  const handleUpdateName = (id: string, name: string) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, name } : row))
    );
  };

  const handleUpdateDirectRate = (id: string, val: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              directRate: val,
              inputMode: 'direct_rate',
            }
          : row
      )
    );
  };

  const handleUpdateReading = (id: string, t: number, val: string) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id === id) {
          return {
            ...row,
            inputMode: 'series',
            readings: {
              ...row.readings,
              [t]: val,
            },
          };
        }
        return row;
      })
    );
  };

  const handleAddRow = () => {
    const nextIdx = rows.length + 1;
    setRows((prev) => [
      ...prev,
      {
        id: 'po_std_' + Date.now().toString().slice(-5),
        standardEu: nextIdx === 1 ? '0.0' : (nextIdx * 1.0).toFixed(1),
        name: `Standard ${nextIdx}`,
        readings: {},
      },
    ]);
  };

  const handleDeleteRow = (id: string) => {
    if (rows.length <= 1) {
      setRows([
        {
          id: 'po_std_1',
          standardEu: '0.0',
          name: 'Calibrator Blank 0.0 EU',
          readings: {},
        },
      ]);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSaveTimePoints = () => {
    const parsed: number[] = timePointsInput
      .split(/[,;\s]+/)
      .map((v) => parseFloat(v))
      .filter((v) => Number.isFinite(v) && v >= 0);

    const uniqueSorted = Array.from(new Set(parsed)).sort(
      (a: number, b: number) => a - b
    );
    if (uniqueSorted.length < 2) {
      alert('Please specify at least 2 distinct time points (e.g. 0, 2, 4, 6, 8, 10 minutes).');
      return;
    }
    setTimePoints(uniqueSorted);
    setTimePointsInput(uniqueSorted.join(', '));
    setIsEditingTimes(false);
  };

  const validStandardsCount = rows.filter(
    (r) =>
      r.standardEu.trim() !== '' &&
      Number.isFinite(parseFloat(r.standardEu)) &&
      parseFloat(r.standardEu) >= 0
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Explanation */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
            <Activity className="w-5 h-5" />
            <h2 className="text-sm font-bold tracking-tight uppercase text-slate-900 dark:text-slate-100">
              Phenoloxidase (PO) Kinetic Standard Curve Module
            </h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            Measures enzyme activation velocity (<span className="font-semibold text-slate-800 dark:text-slate-200">dA/dt</span>, &Delta;OD/min at {poWavelength} nm) across known endotoxin calibrator levels. Generates the linear kinetic calibration curve used to quantify endotoxin in unknown samples.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {setPoWavelength && (
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-lg shadow-2xs">
              <span>Wavelength &lambda;:</span>
              <input
                type="number"
                value={poWavelength}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setPoWavelength(Number.isFinite(val) ? val : 490);
                }}
                className="w-14 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-indigo-700 dark:text-indigo-400 outline-none text-center"
              />
              <span className="text-[10px] text-slate-400">nm</span>
            </label>
          )}

          {onLoadExample && (
            <button
              onClick={onLoadExample}
              className="px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-lg transition cursor-pointer"
            >
              Load Example Standards
            </button>
          )}

          <button
            onClick={onClear}
            className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 rounded-lg transition flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      </div>

      {/* Main Grid: Left Standards Table, Right Calibration Curve Plot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Standards Data Entry */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Kinetic Calibrator Levels (Standards Only)
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Enter known endotoxin standard concentrations and their absorbance time-series
                </p>
              </div>

              {/* Input Mode Selector */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  onClick={() => handleSwitchMode('series')}
                  className={`px-2 py-1 rounded font-medium transition cursor-pointer ${
                    inputMode === 'series'
                      ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 font-bold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Time Series
                </button>
                <button
                  onClick={() => handleSwitchMode('direct_rate')}
                  className={`px-2 py-1 rounded font-medium transition cursor-pointer ${
                    inputMode === 'direct_rate'
                      ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 font-bold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Direct Velocity
                </button>
              </div>
            </div>

            {/* Time points config bar */}
            {inputMode === 'series' && (
              <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="font-semibold text-[11px]">Time Points (min):</span>
                  {!isEditingTimes ? (
                    <span className="font-mono text-indigo-700 dark:text-indigo-400 font-bold">
                      {timePoints.join(', ')}
                    </span>
                  ) : (
                    <input
                      type="text"
                      value={timePointsInput}
                      onChange={(e) => setTimePointsInput(e.target.value)}
                      placeholder="0, 2, 4, 6, 8, 10"
                      className="px-2 py-0.5 text-xs font-mono border border-indigo-400 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 w-44 outline-none"
                    />
                  )}
                </div>

                <div>
                  {!isEditingTimes ? (
                    <button
                      onClick={() => setIsEditingTimes(true)}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Edit Intervals
                    </button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleSaveTimePoints}
                        className="px-2 py-0.5 text-[10px] font-bold bg-indigo-600 text-white rounded hover:bg-indigo-700 cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setTimePointsInput(timePoints.join(', '));
                          setIsEditingTimes(false);
                        }}
                        className="px-2 py-0.5 text-[10px] font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Standards Table (NO Sample ID column) */}
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-xs text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-[11px]">
                    <th className="px-3 py-2.5 text-center w-28 font-bold text-indigo-800 dark:text-indigo-300">
                      Standard (EU/mL)
                    </th>
                    <th className="px-3 py-2.5 w-40">
                      Standard Label / Level
                    </th>
                    {inputMode === 'series' ? (
                      timePoints.map((t) => (
                        <th key={t} className="px-1.5 py-2.5 text-center whitespace-nowrap font-mono">
                          {t} min
                        </th>
                      ))
                    ) : (
                      <th className="px-3 py-2.5 text-center font-bold text-indigo-800 dark:text-indigo-300">
                        Direct Rate (&Delta;A/min)
                      </th>
                    )}
                    <th className="px-2.5 py-2.5 text-center w-24">
                      dA/dt (OD/min)
                    </th>
                    <th className="px-1.5 py-2.5 text-center w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rows.map((row, idx) => {
                    const matchedResult = standardResults.find(
                      (r) =>
                        r.type === 'standard' &&
                        r.standardEu !== undefined &&
                        Math.abs(r.standardEu - parseFloat(row.standardEu)) < 1e-4
                    );

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                        <td className="p-1.5 text-center">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.standardEu}
                            onChange={(e) => handleUpdateStandardEu(row.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') onCompute();
                            }}
                            placeholder="0.0"
                            className="w-24 text-center px-2 py-1 text-xs font-mono font-bold border border-indigo-200 dark:border-indigo-700 bg-indigo-50/40 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={row.name ?? ''}
                            onChange={(e) => handleUpdateName(row.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') onCompute();
                            }}
                            placeholder={`Standard ${idx + 1}`}
                            className="w-full px-2 py-1 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none placeholder:text-slate-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                          />
                        </td>

                        {inputMode === 'series' ? (
                          timePoints.map((t) => (
                            <td key={t} className="p-1 text-center">
                              <input
                                type="number"
                                step="0.001"
                                value={row.readings[t] ?? ''}
                                onChange={(e) => handleUpdateReading(row.id, t, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') onCompute();
                                }}
                                placeholder="0.000"
                                className="w-14 text-center px-1 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none placeholder:text-slate-300 font-mono bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                              />
                            </td>
                          ))
                        ) : (
                          <td className="p-1.5 text-center">
                            <input
                              type="number"
                              step="0.0001"
                              value={row.directRate ?? ''}
                              onChange={(e) => handleUpdateDirectRate(row.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') onCompute();
                              }}
                              placeholder="e.g. 0.0085"
                              className="w-32 text-center px-2 py-1 text-xs border border-indigo-200 dark:border-indigo-700 bg-indigo-50/30 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-300 font-mono font-bold rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                          </td>
                        )}

                        <td className="px-2.5 py-1.5 text-center font-mono text-xs">
                          {matchedResult && Number.isFinite(matchedResult.rate) ? (
                            <span className="font-bold text-indigo-700 dark:text-indigo-400">
                              {matchedResult.rate.toFixed(4)}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        <td className="p-1 text-center">
                          <button
                            onClick={() => handleDeleteRow(row.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition cursor-pointer"
                            title="Delete standard level"
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

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddRow}
                  className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Standard Level
                </button>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {validStandardsCount} valid standard level{validStandardsCount !== 1 ? 's' : ''} (min 2 required for linear regression)
              </span>
            </div>
          </div>

          {/* Error / Validation Feedback */}
          {errorMessage && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              {onLoadExample && (
                <button
                  onClick={onLoadExample}
                  className="px-2.5 py-1 font-bold text-xs bg-white dark:bg-slate-800 rounded border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-900 dark:text-amber-200 transition cursor-pointer self-start sm:self-auto shrink-0"
                >
                  Load Example PO Data
                </button>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={onCompute}
              id="btn-compute-po-calibration"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <TrendingUp className="w-4 h-4" />
              Compute PO Calibration Curve
            </button>

            {onGoToEstimator && model && (
              <button
                onClick={onGoToEstimator}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Proceed to Sample Estimator</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right 5 Columns: Visualization & Calibration Model Parameters */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                {chartView === 'progress'
                  ? 'Kinetic Progression Curves'
                  : 'PO Kinetic Calibration Curve'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {chartView === 'progress'
                  ? `Absorbance (OD_${poWavelength}) vs. Reaction Time (minutes)`
                  : 'Reaction Velocity (dA/dt) vs. Endotoxin (EU/mL)'}
              </p>
            </div>

            {/* Toggle chart */}
            <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
              <button
                onClick={() => setChartView('cal')}
                className={`px-2 py-1 text-[10px] font-bold rounded transition cursor-pointer flex items-center gap-1 ${
                  chartView === 'cal'
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <TrendingUp className="w-3 h-3" />
                Std Curve
              </button>
              <button
                onClick={() => setChartView('progress')}
                className={`px-2 py-1 text-[10px] font-bold rounded transition cursor-pointer flex items-center gap-1 ${
                  chartView === 'progress'
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <Activity className="w-3 h-3" />
                Time Curves
              </button>
            </div>
          </div>

          {/* Plot Display */}
          <div className="bg-slate-50/50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-lg p-2 min-h-[260px] flex items-center justify-center">
            {chartView === 'progress' ? (
              standardResults.length > 0 ? (
                <KineticChart results={standardResults} height={260} />
              ) : (
                <div className="text-center p-6 text-slate-400 text-xs italic">
                  Enter standard absorbance readings and click "Compute PO Calibration Curve" to display progression curves.
                </div>
              )
            ) : model ? (
              <KineticCalibrationChart model={model} samples={[]} height={260} />
            ) : (
              <div className="text-center p-6 text-slate-400 text-xs italic">
                A minimum of 2 valid standard levels are required to generate the calibration curve.
              </div>
            )}
          </div>

          {/* Calibration Fit Model Summary Card */}
          {model ? (
            <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 rounded-lg space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-tight text-[11px] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Kinetic Linear Calibration Model
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    model.r2 >= 0.98
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}
                >
                  R² = {model.r2.toFixed(4)}
                </span>
              </div>

              <div className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 p-2 rounded border border-indigo-100 dark:border-indigo-900/60 text-center">
                Rate (dA/dt) = {model.slope.toFixed(5)} &times; [EU/mL] + {model.intercept >= 0 ? '+' : ''}
                {model.intercept.toFixed(5)}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300 pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px]">Slope (m):</span>
                  <span className="font-mono font-semibold">{model.slope.toFixed(6)} OD&middot;min⁻¹&middot;EU⁻¹</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Intercept (b):</span>
                  <span className="font-mono font-semibold">{model.intercept.toFixed(6)} OD/min</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Calibrator Range:</span>
                  <span className="font-mono font-semibold">{model.xMin.toFixed(2)} – {model.xMax.toFixed(2)} EU/mL</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Standard Error:</span>
                  <span className="font-mono font-semibold">{model.stderr !== undefined ? model.stderr.toFixed(5) : '—'}</span>
                </div>
              </div>

              {model.r2 < 0.98 && (
                <div className="flex items-start gap-1.5 p-2 bg-amber-100/70 dark:bg-amber-950/60 rounded text-[10px] text-amber-800 dark:text-amber-200 mt-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Linearity is below typical bioassay thresholds (R² &lt; 0.98). Check standard dilutions or kinetic intervals.
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 text-xs text-center">
              No calibration model computed yet. Click "Compute PO Calibration Curve" above to fit standards.
            </div>
          )}

          {onDownloadCsv && model && (
            <button
              onClick={onDownloadCsv}
              className="w-full py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              Export Standards &amp; Curve CSV
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
