import React, { useState } from 'react';
import {
  KineticSampleRow,
  KineticResult,
  KineticCalibrationModel,
  SampleEstimateResult,
  PoInputMode,
} from '../types';
import { KineticChart } from './KineticChart';
import { KineticCalibrationChart } from './KineticCalibrationChart';
import {
  Activity,
  Plus,
  Trash2,
  Play,
  RotateCcw,
  Download,
  Sparkles,
  Info,
  Clock,
  CheckCircle2,
  TrendingUp,
  LineChart,
  GitCompare,
  Layers,
  Sliders,
} from 'lucide-react';

interface PhenoloxidaseTabProps {
  timePoints: number[];
  setTimePoints: (pts: number[]) => void;
  rows: KineticSampleRow[];
  setRows: React.Dispatch<React.SetStateAction<KineticSampleRow[]>>;
  results: KineticResult[];
  model: KineticCalibrationModel | null;
  poWavelength?: number;
  setPoWavelength?: (w: number) => void;
  coagResults?: SampleEstimateResult[];
  onCompute: () => void;
  onClear: () => void;
  onLoadExample: () => void;
  onDownloadCsv: () => void;
  onGoToCompare?: () => void;
}

export const PhenoloxidaseTab: React.FC<PhenoloxidaseTabProps> = ({
  timePoints,
  setTimePoints,
  rows,
  setRows,
  results,
  model,
  poWavelength = 490,
  setPoWavelength,
  coagResults = [],
  onCompute,
  onClear,
  onLoadExample,
  onDownloadCsv,
  onGoToCompare,
}) => {
  const [inputMode, setInputMode] = useState<PoInputMode>('series');
  const [timePointsInput, setTimePointsInput] = useState(timePoints.join(', '));
  const [isEditingTimes, setIsEditingTimes] = useState(false);
  const [chartView, setChartView] = useState<'progress' | 'cal'>('progress');

  const handleUpdateName = (id: string, name: string) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, name } : row))
    );
  };

  const handleUpdateType = (id: string, type: 'standard' | 'sample') => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              type,
              standardEu:
                type === 'standard'
                  ? row.standardEu || '1.0'
                  : undefined,
            }
          : row
      )
    );
  };

  const handleUpdateStandardEu = (id: string, val: string) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, standardEu: val } : row))
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

  const handleAddRow = (type: 'standard' | 'sample' = 'sample') => {
    const nextId = 'k' + (rows.length + 1) + '_' + Date.now().toString().slice(-4);
    setRows((prev) => [
      ...prev,
      {
        id: nextId,
        name:
          type === 'standard'
            ? `Standard ${prev.filter((r) => r.type === 'standard').length + 1}`
            : `Sample ${prev.filter((r) => r.type === 'sample').length + 1}`,
        type,
        standardEu: type === 'standard' ? '1.0' : undefined,
        inputMode,
        directRate: '',
        readings: {},
      },
    ]);
  };

  const handleDeleteRow = (id: string) => {
    if (rows.length <= 1) {
      setRows([{ id: 'k1', name: '', type: 'sample', readings: {} }]);
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

  // Metrics computation
  const validResults = results.filter((r) => r.valid);
  const maxRate = validResults.length
    ? Math.max(...validResults.map((r) => r.rate))
    : NaN;
  const avgR2 = validResults.length
    ? validResults.reduce((acc, r) => acc + (Number.isFinite(r.r2) ? r.r2 : 0), 0) /
      validResults.length
    : NaN;

  const validCoag = coagResults.filter((c) => Number.isFinite(c.eu));

  return (
    <div className="space-y-6">
      {/* Top Banner / Explanation */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-700">
            <Activity className="w-5 h-5" />
            <h2 className="text-sm font-bold tracking-tight uppercase text-slate-900">
              Phenoloxidase (PO) Kinetic Assay &amp; Calibration Module
            </h2>
          </div>
          <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
            Measures enzyme activation velocity (<span className="font-semibold text-slate-800">dA/dt</span>, &Delta;OD/min at {poWavelength} nm). Generates kinetic calibration curves to quantify endotoxin in unknown infusion fluids.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {setPoWavelength && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs shadow-2xs">
              <span className="text-slate-500 font-medium">&lambda; (nm):</span>
              <input
                type="number"
                value={poWavelength}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setPoWavelength(Number.isFinite(val) ? val : 490);
                }}
                className="w-14 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-emerald-700 outline-none text-center focus:ring-1 focus:ring-emerald-500"
                title="Phenoloxidase wavelength in nm (documentation parameter only — pure linear regression is applied)"
              />
            </div>
          )}

          <button
            onClick={onLoadExample}
            className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            title="Populate standard study calibration and commercial fluid test fractions"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Load PO Study
          </button>
          <button
            onClick={onClear}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear
          </button>
          <button
            onClick={onCompute}
            className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Calculate Rates &amp; Estimate EU/mL
          </button>
        </div>
      </div>

      {/* Configuration & Data Entry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Data Entry Table */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                Kinetic Data Matrix ({inputMode === 'series' ? 'Time Series' : 'Direct Rates'})
              </h3>
              <p className="text-[11px] text-slate-500">
                Designate rows as <strong>Standard</strong> (known EU/mL) or <strong>Unknown Sample</strong>
              </p>
            </div>

            {/* Input Mode Selector Toggle */}
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setInputMode('series')}
                  className={`px-2 py-1 text-[10px] font-bold rounded transition cursor-pointer flex items-center gap-1 ${
                    inputMode === 'series'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Multi-point absorbance time-course (0, 2, 4, 6, 8, 10 min)"
                >
                  <Clock className="w-3 h-3" />
                  Time Series
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputMode('direct_rate');
                    setChartView('cal');
                  }}
                  className={`px-2 py-1 text-[10px] font-bold rounded transition cursor-pointer flex items-center gap-1 ${
                    inputMode === 'direct_rate'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Enter pre-calculated single velocity (dA/min) from microplate reader"
                >
                  <Layers className="w-3 h-3" />
                  Direct Rates (&Delta;A/min)
                </button>
              </div>

              {inputMode === 'series' && (
                <div>
                  {isEditingTimes ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={timePointsInput}
                        onChange={(e) => setTimePointsInput(e.target.value)}
                        placeholder="e.g. 0, 2, 4, 6, 8, 10"
                        className="w-36 px-2 py-1 text-xs border border-indigo-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                      <button
                        onClick={handleSaveTimePoints}
                        className="px-2 py-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setTimePointsInput(timePoints.join(', '));
                          setIsEditingTimes(false);
                        }}
                        className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditingTimes(true)}
                      className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 underline underline-offset-2 cursor-pointer ml-1"
                    >
                      Times ({timePoints.length} pts)
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Table Rendering */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs text-left border-collapse min-w-[580px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                  <th className="px-2.5 py-2.5 w-28">Type</th>
                  <th className="px-2.5 py-2.5 w-36">Sample / Fraction</th>
                  <th className="px-2 py-2.5 text-center w-24">Std EU/mL</th>
                  {inputMode === 'series' ? (
                    timePoints.map((t) => (
                      <th key={t} className="px-1.5 py-2.5 text-center whitespace-nowrap">
                        {t} min
                      </th>
                    ))
                  ) : (
                    <th className="px-3 py-2.5 text-center font-bold text-indigo-800">
                      Direct Rate (&Delta;A/min)
                    </th>
                  )}
                  <th className="px-1.5 py-2.5 text-center w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const isStd = row.type === 'standard';
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-1.5">
                        <select
                          value={row.type}
                          onChange={(e) =>
                            handleUpdateType(
                              row.id,
                              e.target.value as 'standard' | 'sample'
                            )
                          }
                          className={`w-full px-2 py-1 text-[11px] font-semibold rounded border outline-none cursor-pointer ${
                            isStd
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-800'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <option value="standard">Standard</option>
                          <option value="sample">Sample</option>
                        </select>
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => handleUpdateName(row.id, e.target.value)}
                          placeholder={
                            isStd ? 'e.g. Std 1.0 EU' : 'e.g. 5% Dextrose Sample'
                          }
                          className="w-full px-2 py-1 text-xs font-medium border border-slate-200 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none placeholder:text-slate-400 bg-white"
                        />
                      </td>
                      <td className="p-1.5 text-center">
                        {isStd ? (
                          <input
                            type="number"
                            step="0.01"
                            value={row.standardEu ?? ''}
                            onChange={(e) =>
                              handleUpdateStandardEu(row.id, e.target.value)
                            }
                            placeholder="0.0"
                            className="w-20 text-center px-1 py-1 text-xs font-mono font-bold border border-indigo-200 bg-indigo-50/40 text-indigo-900 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                          />
                        ) : (
                          <span className="text-[11px] text-slate-300 font-mono">—</span>
                        )}
                      </td>

                      {inputMode === 'series' ? (
                        timePoints.map((t) => (
                          <td key={t} className="p-1 text-center">
                            <input
                              type="number"
                              step="0.001"
                              value={row.readings[t] ?? ''}
                              onChange={(e) =>
                                handleUpdateReading(row.id, t, e.target.value)
                              }
                              placeholder="0.000"
                              className="w-14 text-center px-1 py-1 text-xs border border-slate-200 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none placeholder:text-slate-300 font-mono bg-white"
                            />
                          </td>
                        ))
                      ) : (
                        <td className="p-1.5 text-center">
                          <input
                            type="number"
                            step="0.0001"
                            value={row.directRate ?? ''}
                            onChange={(e) =>
                              handleUpdateDirectRate(row.id, e.target.value)
                            }
                            placeholder="e.g. 0.0085"
                            className="w-32 text-center px-2 py-1 text-xs border border-indigo-200 bg-indigo-50/30 text-indigo-900 font-mono font-bold rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                          />
                        </td>
                      )}

                      <td className="p-1 text-center">
                        <button
                          onClick={() => handleDeleteRow(row.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                          title="Delete row"
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
                onClick={() => handleAddRow('standard')}
                className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md flex items-center gap-1 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Standard Level
              </button>
              <button
                onClick={() => handleAddRow('sample')}
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md flex items-center gap-1 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Unknown Sample
              </button>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              {rows.length} total series &bull; Mode: {inputMode === 'series' ? 'Kinetic Series' : 'Direct Velocities'}
            </span>
          </div>
        </div>

        {/* Right 5 Columns: Reaction Progress / Calibration Chart */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                {chartView === 'progress'
                  ? 'Kinetic Progression Curves'
                  : 'PO Kinetic Calibration Curve'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {chartView === 'progress'
                  ? `Absorbance (OD_${poWavelength}) vs. Reaction Time (minutes)`
                  : 'Kinetic Rate (dA/dt) vs. Endotoxin (EU/mL)'}
              </p>
            </div>

            {/* Toggle view button */}
            {model && (
              <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                <button
                  onClick={() => setChartView('progress')}
                  className={`px-2 py-1 text-[10px] font-bold rounded transition cursor-pointer flex items-center gap-1 ${
                    chartView === 'progress'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Activity className="w-3 h-3" />
                  Time Curves
                </button>
                <button
                  onClick={() => setChartView('cal')}
                  className={`px-2 py-1 text-[10px] font-bold rounded transition cursor-pointer flex items-center gap-1 ${
                    chartView === 'cal'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <TrendingUp className="w-3 h-3" />
                  PO Std Curve
                </button>
              </div>
            )}
          </div>

          <div className="border border-slate-100 rounded-lg p-2 bg-slate-50/50">
            {chartView === 'cal' && model ? (
              <KineticCalibrationChart
                model={model}
                samples={validResults}
                height={260}
              />
            ) : validResults.length > 0 ? (
              <KineticChart results={validResults} height={260} />
            ) : (
              <div className="h-[260px] flex flex-col items-center justify-center text-slate-400 text-xs text-center p-4">
                <Activity className="w-8 h-8 text-slate-300 mb-2 stroke-[1.5]" />
                <p className="font-medium text-slate-600">No Kinetic Rates Calculated Yet</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Click "Calculate Rates &amp; Estimate EU/mL" or "Load PO Study".
                </p>
              </div>
            )}
          </div>

          {model && (
            <div className="p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1.5 shadow-2xs">
              <span className="font-semibold text-indigo-900">
                Linear Regression Calibration Fit:
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-100">
                  Rate = {model.slope >= 0 ? model.slope.toFixed(5) : `-${Math.abs(model.slope).toFixed(5)}`} &times; [EU] {model.intercept >= 0 ? `+ ${model.intercept.toFixed(5)}` : `- ${Math.abs(model.intercept).toFixed(5)}`}
                </span>
                <span className="font-mono text-emerald-700 font-bold bg-white px-2 py-0.5 rounded border border-emerald-100">
                  R&sup2; = {model.r2.toFixed(4)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      {validResults.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">
              Peak Kinetic Rate (dA/dt)
            </div>
            <div className="text-xl font-extrabold text-indigo-600 font-mono">
              {Number.isFinite(maxRate) ? `${maxRate.toFixed(4)}` : '—'}
              <span className="text-xs font-normal text-slate-500 ml-1.5">OD/min</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Highest observed phenoloxidase reaction velocity
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">
              PO Curve Linearity (R²)
            </div>
            <div className="text-xl font-extrabold text-emerald-600 font-mono">
              {model ? model.r2.toFixed(4) : (Number.isFinite(avgR2) ? avgR2.toFixed(4) : '—')}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {model ? 'Regression fit of standard rate vs. EU/mL' : 'Mean linearity of time courses'}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">
              PO Calibration Sensitivity (Slope)
            </div>
            <div className="text-xl font-extrabold text-slate-900 font-mono">
              {model ? model.slope.toFixed(4) : '—'}
              <span className="text-xs font-normal text-slate-500 ml-1.5">OD/min per EU</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Substrate conversion rate per unit endotoxin
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">
              Estimated Samples
            </div>
            <div className="text-xl font-extrabold text-slate-900 font-mono">
              {validResults.filter((r) => r.type === 'sample').length}
              <span className="text-xs font-normal text-slate-500 ml-1.5">unknowns</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Commercial samples evaluated for EU/mL
            </p>
          </div>
        </div>
      )}

      {/* Dual-Assay Quick Link if coagulation results exist */}
      {validCoag.length > 0 && validResults.filter((r) => r.type === 'sample' && r.estimatedEu !== undefined).length > 0 && onGoToCompare && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <GitCompare className="w-5 h-5 text-emerald-700 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                Both Coagulation &amp; Phenoloxidase Endotoxin Estimates Are Ready!
              </h4>
              <p className="text-xs text-emerald-700">
                You can now perform cross-assay concordance validation to compare estimated concentrations.
              </p>
            </div>
          </div>
          <button
            onClick={onGoToCompare}
            className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
          >
            <GitCompare className="w-3.5 h-3.5" />
            View Cross-Assay Comparison
          </button>
        </div>
      )}

      {/* Kinetic Rate & Sample Estimation Table with Remarks */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Phenoloxidase Kinetic Velocity &amp; Endotoxin Estimation Results
            </h3>
            <p className="text-[11px] text-slate-500">
              Calculated slope (&Delta;A/min), inverse calibration estimate (EU/mL), and biological status remarks
            </p>
          </div>

          {validResults.length > 0 && (
            <button
              onClick={onDownloadCsv}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Export Kinetic CSV
            </button>
          )}
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3.5 py-2.5">Sample / Fraction</th>
                <th className="px-3.5 py-2.5">Kinetic Rate (dA/min)</th>
                <th className="px-3.5 py-2.5">Linearity (R²)</th>
                <th className="px-3.5 py-2.5 font-bold text-indigo-900">PO Estimated EU/mL</th>
                <th className="px-3.5 py-2.5">Biological Status &amp; Remarks</th>
                <th className="px-3.5 py-2.5 text-right">Activity Badge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400 italic">
                    Click "Calculate Rates &amp; Estimate EU/mL" to compute reaction velocities for the table above.
                  </td>
                </tr>
              ) : (
                results.map((res) => {
                  if (!res.valid) {
                    return (
                      <tr key={res.id} className="text-slate-400">
                        <td className="px-3 py-2.5 uppercase text-[10px] font-bold">
                          {res.type}
                        </td>
                        <td className="px-3.5 py-2.5 font-medium">{res.name}</td>
                        <td colSpan={4} className="px-3.5 py-2.5 italic">
                          Insufficient time readings (minimum 2 points required)
                        </td>
                        <td className="px-3.5 py-2.5 text-right text-slate-400 font-medium text-[10px] uppercase">
                          Incomplete
                        </td>
                      </tr>
                    );
                  }

                  const isStd = res.type === 'standard';
                  const isHigh = res.rate >= 0.01;
                  const isBaseline = res.rate < 0.001;

                  return (
                    <tr key={res.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                            isStd
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {res.type}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 font-semibold text-slate-900">
                        {res.name}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono font-bold text-indigo-700">
                        {res.rate.toFixed(5)} <span className="text-[10px] font-sans font-normal text-slate-400">OD/min</span>
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-slate-700">
                        {Number.isFinite(res.r2) ? res.r2.toFixed(4) : (res.inputMode === 'direct_rate' ? 'Direct' : '—')}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono font-bold">
                        {isStd ? (
                          <span className="text-slate-500 font-normal">
                            Std {res.standardEu !== undefined ? res.standardEu.toFixed(2) : '—'} EU/mL
                          </span>
                        ) : res.estimatedEu !== undefined &&
                          Number.isFinite(res.estimatedEu) ? (
                          <span
                            className={
                              res.estimatedEu < 0
                                ? 'text-amber-600'
                                : 'text-indigo-900 text-sm'
                            }
                          >
                            {res.estimatedEu.toFixed(3)}{' '}
                            <span className="text-[10px] text-slate-500 font-normal">
                              EU/mL
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            {model
                              ? 'Pending'
                              : 'Define ≥2 Standards to estimate'}
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-600 text-xs">
                        {res.remark || (
                          isBaseline
                            ? 'Baseline substrate conversion (sterile / negative)'
                            : isHigh
                            ? 'Rapid dopachrome formation (high prophenoloxidase stimulus)'
                            : 'Active phenoloxidase substrate oxidation'
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isBaseline
                              ? 'bg-slate-100 text-slate-600 border border-slate-200'
                              : isHigh
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                          }`}
                        >
                          {res.status || (isBaseline ? 'Baseline' : isHigh ? 'High Activity' : 'Active PO')}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scientific Methodology & Status Guide Note */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
          <div className="font-semibold text-slate-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
            <Info className="w-3.5 h-3.5 text-indigo-600" />
            Prophenoloxidase Activation Mechanism
          </div>
          <p className="leading-relaxed text-[11px]">
            The phenoloxidase kinetic assay evaluates the initial activation velocity (dA/dt = &Delta;A / &Delta;t at {poWavelength} nm) resulting from the enzymatic conversion of substrate into dopachrome. When standard endotoxin solutions are assayed, the reaction velocity forms a calibration curve from which unknown pyrogen concentrations in commercial fluids are estimated.
          </p>
        </div>

        <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl text-xs text-slate-600 space-y-1">
          <div className="font-semibold text-indigo-900 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5 text-indigo-700" />
            Phenoloxidase Status Reference
          </div>
          <ul className="text-[11px] space-y-0.5 text-slate-700">
            <li>&bull; <strong>Baseline (&lt; 0.001 OD/min):</strong> Minimal substrate turnover, negative control reference.</li>
            <li>&bull; <strong>Active PO (0.001 - 0.010 OD/min):</strong> Moderate enzymatic activity.</li>
            <li>&bull; <strong>High Activity (≥ 0.010 OD/min):</strong> Rapid substrate conversion indicating potent immune cascade stimulus.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

