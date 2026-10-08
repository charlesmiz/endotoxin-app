import { useState, useEffect, useMemo } from 'react';
import {
  CalibrationRow,
  CalibrationModelFit,
  SampleRow,
  PoSampleRow,
  SampleEstimateResult,
  PoStandardRow,
  KineticSampleRow,
  KineticResult,
  KineticCalibrationModel,
  AssayComparisonItem,
  WavelengthSettings,
  PairingSummary,
  generateRowId,
  createBlankPoStandardRow,
  EMPTY_PO_STANDARD_ROWS,
  EMPTY_CAL_ROWS,
  EMPTY_COAG_SAMPLE_ROWS,
  EMPTY_PO_SAMPLE_ROWS,
} from './types';
import {
  chooseModel,
  summarizeReplicates,
  computeSampleEstimates,
  computeKineticRates,
  computeAssayComparison,
  computePairingSummary,
} from './utils/math';
import { formatCoagulationCsv, formatKineticCsv, formatComparisonCsv } from './utils/csv';
import { DETERMINISTIC_STUDY_FIXTURE } from './data/studyFixtures';
import { Header } from './components/Header';
import { StandardCurveTab } from './components/StandardCurveTab';
import { PhenoloxidaseCurveTab } from './components/PhenoloxidaseCurveTab';
import { SampleEstimatorTab } from './components/SampleEstimatorTab';
import { DualAssayComparisonSection } from './components/DualAssayComparisonSection';
import { ValidationReportTab } from './components/ValidationReportTab';
import { LabManualModal } from './components/LabManualModal';
import { FAVICON_COLLECTION, applyFaviconToDocument } from './data/favicons';
import { useTheme } from './utils/theme';
import { GitCompare } from 'lucide-react';

export { EMPTY_PO_STANDARD_ROWS, EMPTY_CAL_ROWS, EMPTY_COAG_SAMPLE_ROWS, EMPTY_PO_SAMPLE_ROWS };

const EXAMPLE_CAL_ROWS: CalibrationRow[] = [
  { id: '1', eu: '0', abs: '0.005', replicates: '' },
  { id: '2', eu: '0.5', abs: '0.048', replicates: '0.047, 0.049' },
  { id: '3', eu: '2.0', abs: '0.185', replicates: '0.184, 0.186' },
  { id: '4', eu: '5.0', abs: '0.452', replicates: '0.450, 0.454' },
];

const DEFAULT_TIME_POINTS = [0, 2, 4, 6, 8, 10];

const EXAMPLE_PO_STANDARD_ROWS: PoStandardRow[] = [
  {
    id: 'po_std_0',
    standardEu: '0.0',
    name: 'Calibrator Blank (0.0 EU)',
    readings: { 0: '0.010', 2: '0.011', 4: '0.011', 6: '0.012', 8: '0.012', 10: '0.013' },
  },
  {
    id: 'po_std_1',
    standardEu: '0.5',
    name: 'Standard 0.5 EU/mL',
    readings: { 0: '0.020', 2: '0.027', 4: '0.035', 6: '0.043', 8: '0.050', 10: '0.058' },
  },
  {
    id: 'po_std_2',
    standardEu: '2.0',
    name: 'Standard 2.0 EU/mL',
    readings: { 0: '0.030', 2: '0.058', 4: '0.086', 6: '0.114', 8: '0.142', 10: '0.170' },
  },
  {
    id: 'po_std_3',
    standardEu: '5.0',
    name: 'Standard 5.0 EU/mL',
    readings: { 0: '0.045', 2: '0.115', 4: '0.185', 6: '0.255', 8: '0.325', 10: '0.395' },
  },
];

const EXAMPLE_COAG_SAMPLE_ROWS: SampleRow[] = [
  { id: 'c1', sampleId: 'S1', name: 'Commercial Infusion A', abs: '0.082', replicates: '0.081, 0.083', dilutionFactor: '1' },
  { id: 'c2', sampleId: 'S2', name: 'Sterile Water Control', abs: '0.008', replicates: '', dilutionFactor: '1' },
  { id: 'c3', sampleId: 'S3', name: 'Commercial Infusion B', abs: '0.310', replicates: '0.308, 0.312', dilutionFactor: '1' },
];

const EXAMPLE_PO_SAMPLE_ROWS: PoSampleRow[] = [
  {
    id: 'p1',
    sampleId: 'S1',
    name: 'Commercial Infusion A',
    readings: { 0: '0.025', 2: '0.038', 4: '0.052', 6: '0.065', 8: '0.078', 10: '0.091' },
  },
  {
    id: 'p2',
    sampleId: 'S2',
    name: 'Sterile Water Control',
    readings: { 0: '0.010', 2: '0.011', 4: '0.010', 6: '0.012', 8: '0.011', 10: '0.013' },
  },
  {
    id: 'p3',
    sampleId: 'S3',
    name: 'Commercial Infusion B',
    readings: { 0: '0.035', 2: '0.089', 4: '0.143', 6: '0.197', 8: '0.251', 10: '0.305' },
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'cal' | 'po' | 'est' | 'cmp' | 'rep'>('cal');
  const [runLabel, setRunLabel] = useState('Run 1');
  const [model, setModel] = useState<'linear' | 'quadratic'>('linear');
  const [threshold, setThreshold] = useState<number>(0.5);

  // Wavelength Settings
  const [wavelengths, setWavelengths] = useState<WavelengthSettings>({
    coagulation: 540,
    phenoloxidase: 490,
  });

  // Coagulation Calibration
  const [calRows, setCalRows] = useState<CalibrationRow[]>(EMPTY_CAL_ROWS);
  const [calibration, setCalibration] = useState<CalibrationModelFit | null>(null);
  const [coagCurveError, setCoagCurveError] = useState<string | null>(null);

  // Phenoloxidase Calibration (Standalone)
  const [timePoints, setTimePoints] = useState<number[]>(DEFAULT_TIME_POINTS);
  const [poStandardRows, setPoStandardRows] = useState<PoStandardRow[]>(EMPTY_PO_STANDARD_ROWS);
  const [poStandardResults, setPoStandardResults] = useState<KineticResult[]>([]);
  const [kineticModel, setKineticModel] = useState<KineticCalibrationModel | null>(null);
  const [poCurveError, setPoCurveError] = useState<string | null>(null);

  // Two Independent Tables for Unknown Samples
  const [coagRows, setCoagRows] = useState<SampleRow[]>(EMPTY_COAG_SAMPLE_ROWS);
  const [poRows, setPoRows] = useState<PoSampleRow[]>(EMPTY_PO_SAMPLE_ROWS);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  // Estimation Results
  const [sampleResults, setSampleResults] = useState<SampleEstimateResult[]>([]);
  const [kineticResults, setKineticResults] = useState<KineticResult[]>([]);

  // Cross-Assay Matched Pairs (sharing Sample ID)
  const [comparisons, setComparisons] = useState<AssayComparisonItem[]>([]);

  // UI Modals
  const [isLabManualOpen, setIsLabManualOpen] = useState(false);

  // Theme Hook
  const { preference, isDark, toggleTheme } = useTheme();

  useEffect(() => {
    try {
      if (FAVICON_COLLECTION[0]) {
        applyFaviconToDocument(FAVICON_COLLECTION[0].svg);
      }
    } catch {
      // safe
    }
  }, []);

  // Single source of truth for cross-assay pairing counts and summary
  const pairingSummary = useMemo(() => {
    return computePairingSummary(coagRows, poRows);
  }, [coagRows, poRows]);

  // Update Cross-Assay Concordance whenever sampleResults or kineticResults change
  useEffect(() => {
    if (sampleResults.length > 0 && kineticResults.length > 0) {
      const matched = computeAssayComparison(sampleResults, kineticResults);
      setComparisons(matched);
    } else {
      setComparisons([]);
    }
  }, [sampleResults, kineticResults]);

  // Compute coagulation calibration curve
  const handleComputeCalibration = () => {
    const pts: [number, number][] = [];
    const meta: any[] = [];

    calRows.forEach((row) => {
      const x = parseFloat(row.eu.replace(',', '.'));
      const meanAbs = parseFloat(row.abs.replace(',', '.'));
      if (!Number.isFinite(x) || !Number.isFinite(meanAbs)) return;

      const summary = summarizeReplicates(meanAbs, row.replicates);
      if (Number.isFinite(summary.mean)) {
        pts.push([x, summary.mean]);
        meta.push({
          eu: x,
          mean: summary.mean,
          sd: summary.sd,
          cv: summary.cv,
          n: summary.n,
          replicates: summary.values,
        });
      }
    });

    if (pts.length < 2) {
      setCoagCurveError('Please enter at least 2 valid calibration points with EU/mL and absorbance values.');
      return;
    }

    setCoagCurveError(null);
    const fit = chooseModel(pts, model);
    const xVals = pts.map((p) => p[0]);
    const newCal: CalibrationModelFit = {
      ...fit,
      model,
      requestedModel: model,
      points: pts,
      meta,
      xMin: Math.min(...xVals),
      xMax: Math.max(...xVals),
    };

    setCalibration(newCal);
  };

  // Compute Phenoloxidase Standalone Standard Curve
  const handleComputePoCurve = () => {
    const stdRows: KineticSampleRow[] = poStandardRows.map((r, idx) => {
      const hasDirect = r.directRate !== undefined && r.directRate.trim() !== '';
      return {
        id: r.id,
        sampleId: `STD_${idx + 1}`,
        name:
          r.name ||
          (r.standardEu && r.standardEu.trim() !== ''
            ? `Standard ${r.standardEu} EU/mL`
            : `Standard ${idx + 1}`),
        type: 'standard',
        inputMode: hasDirect ? 'direct_rate' : (r.inputMode || 'series'),
        standardEu: r.standardEu,
        directRate: r.directRate,
        readings: r.readings || {},
      };
    });

    const { results, model: fittedModel, skippedRows } = computeKineticRates(
      timePoints,
      stdRows,
      threshold,
      runLabel
    );
    const validStandards = results.filter(
      (r) => r.type === 'standard' && r.valid && r.standardEu !== undefined
    );

    if (validStandards.length < 2 || !fittedModel || !fittedModel.isValid) {
      const skippedMsg =
        skippedRows && skippedRows.length > 0 ? ` (${skippedRows.join(', ')})` : '';
      setPoCurveError(
        `Insufficient valid standard data: At least 2 standard levels with non-empty EU ≥ 0 and valid rates are required${skippedMsg}.`
      );
      setKineticModel(null);
      setPoStandardResults([]);
      return;
    }

    setPoCurveError(null);
    setPoStandardResults(validStandards);
    setKineticModel(fittedModel);
  };

  // Estimate Coagulation Samples Only
  const handleEstimateCoag = () => {
    if (!calibration) {
      setEstimateError('Please compute the Coagulation calibration curve first.');
      return;
    }

    const validCoag = coagRows
      .filter((r) => r.name.trim() !== '' || (r.sampleId && r.sampleId.trim() !== ''))
      .map((row, idx) => {
        const meanAbs = parseFloat(row.abs.replace(',', '.'));
        if (!Number.isFinite(meanAbs)) return null;
        const summary = summarizeReplicates(meanAbs, row.replicates);
        if (!Number.isFinite(summary.mean)) return null;
        return {
          id: row.id,
          sampleId: (row.sampleId && row.sampleId.trim()) || '',
          name: row.name.trim() || (row.sampleId && row.sampleId.trim()) || '',
          abs: summary.mean,
          sd: summary.sd,
          cv: summary.cv,
          n: summary.n,
          replicates: summary.values,
          dilutionFactor: row.dilutionFactor ? parseFloat(row.dilutionFactor.replace(',', '.')) : 1,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);

    if (validCoag.length > 0) {
      setEstimateError(null);
      setSampleResults(computeSampleEstimates(calibration, validCoag, threshold, runLabel));
    } else {
      setSampleResults([]);
      setEstimateError('No valid coagulation samples found. Please enter absorbance values.');
    }
  };

  // Estimate Phenoloxidase Samples Only
  const handleEstimatePo = () => {
    if (!kineticModel) {
      setEstimateError('Please compute the Phenoloxidase kinetic calibration curve first.');
      return;
    }

    const stdRows: KineticSampleRow[] = poStandardRows
      .filter((r) => r.standardEu.trim() !== '' && Number.isFinite(parseFloat(r.standardEu.replace(',', '.'))))
      .map((r, idx) => {
        const hasDirect = r.directRate !== undefined && r.directRate.trim() !== '';
        return {
          id: r.id,
          sampleId: `STD_${idx + 1}`,
          name: r.name || `Standard ${r.standardEu} EU/mL`,
          type: 'standard',
          inputMode: hasDirect ? 'direct_rate' : (r.inputMode || 'series'),
          standardEu: r.standardEu,
          directRate: r.directRate,
          readings: r.readings || {},
        };
      });

    const smpRows: KineticSampleRow[] = poRows
      .filter((r) => r.name.trim() !== '' || (r.sampleId && r.sampleId.trim() !== ''))
      .map((r, idx) => {
        const hasDirect = r.directRate !== undefined && r.directRate.trim() !== '';
        return {
          id: r.id,
          sampleId: (r.sampleId && r.sampleId.trim()) || '',
          name: r.name.trim() || (r.sampleId && r.sampleId.trim()) || '',
          type: 'sample' as const,
          inputMode: hasDirect ? 'direct_rate' : (r.inputMode || 'series'),
          directRate: r.directRate,
          readings: r.readings || {},
        };
      });

    if (smpRows.length === 0) {
      setKineticResults([]);
      setEstimateError('No valid phenoloxidase samples found. Please enter sample readings or direct rates.');
      return;
    }

    const { results } = computeKineticRates(timePoints, [...stdRows, ...smpRows], threshold, runLabel);
    const validSamples = results.filter((r) => r.type === 'sample');

    // Ensure estimatedEu is calculated using the active kineticModel
    if (kineticModel && kineticModel.slope > 0) {
      validSamples.forEach((res) => {
        if (res.valid && res.estimatedEu === undefined && Number.isFinite(res.rate)) {
          const rawEst = (res.rate - kineticModel.intercept) / kineticModel.slope;
          res.estimatedEu = rawEst;
          res.reportedEu = rawEst;
          res.reportableText = `${rawEst.toFixed(3)} EU/mL`;
          const isAbove = rawEst > threshold;
          res.compliance = isAbove ? 'FLAGGED' : 'PASS';
          res.status = isAbove ? 'FLAGGED' : 'PASS';
        }
      });
    }

    setEstimateError(null);
    setKineticResults(validSamples);
  };

  // Master Estimate: Estimate Both Independent Tables
  const handleEstimateAll = () => {
    if (!calibration && !kineticModel) {
      setEstimateError('Please compute at least one calibration curve (Coagulation Curve or PO Kinetic Curve) before estimating samples.');
      return;
    }
    setEstimateError(null);
    if (calibration) {
      handleEstimateCoag();
    }
    if (kineticModel) {
      handleEstimatePo();
    }
  };

  // Clear Handlers
  const handleClearCal = () => {
    setCalRows([
      { id: generateRowId('coag_std_'), eu: '', abs: '', replicates: '' },
      { id: generateRowId('coag_std_'), eu: '', abs: '', replicates: '' },
    ]);
    setCalibration(null);
    setCoagCurveError(null);
  };

  const handleClearPoCurve = () => {
    setPoStandardRows([
      createBlankPoStandardRow(),
      createBlankPoStandardRow(),
    ]);
    setPoStandardResults([]);
    setKineticModel(null);
    setPoCurveError(null);
  };

  const handleClearSamples = () => {
    setCoagRows([
      { id: generateRowId('coag_smp_'), sampleId: '', name: '', abs: '', replicates: '', dilutionFactor: '' },
      { id: generateRowId('coag_smp_'), sampleId: '', name: '', abs: '', replicates: '', dilutionFactor: '' },
    ]);
    setPoRows([
      { id: generateRowId('po_smp_'), sampleId: '', name: '', directRate: '', readings: {} },
      { id: generateRowId('po_smp_'), sampleId: '', name: '', directRate: '', readings: {} },
    ]);
    setSampleResults([]);
    setKineticResults([]);
    setComparisons([]);
    setEstimateError(null);
  };

  // Example Loaders
  const handleLoadExampleCal = () => {
    setCalRows(EXAMPLE_CAL_ROWS);
    setCoagCurveError(null);
  };

  const handleLoadExamplePoCurve = () => {
    setTimePoints(DEFAULT_TIME_POINTS);
    setPoStandardRows(EXAMPLE_PO_STANDARD_ROWS);
    setPoCurveError(null);
    const stdRows: KineticSampleRow[] = EXAMPLE_PO_STANDARD_ROWS.map((r, idx) => ({
      id: r.id,
      sampleId: `STD_${idx + 1}`,
      name: r.name || `Standard ${r.standardEu} EU/mL`,
      type: 'standard',
      standardEu: r.standardEu,
      readings: r.readings,
    }));
    const { results, model: fittedModel } = computeKineticRates(DEFAULT_TIME_POINTS, stdRows);
    setPoStandardResults(results.filter((r) => r.type === 'standard'));
    setKineticModel(fittedModel);
  };

  const handleLoadExampleSamples = () => {
    setCoagRows(EXAMPLE_COAG_SAMPLE_ROWS);
    setPoRows(EXAMPLE_PO_SAMPLE_ROWS);
  };

  // One-click dual-assay study loader (deterministic, synchronous, zero-delay)
  const handleLoadFullDualAssayStudy = () => {
    const fixture = DETERMINISTIC_STUDY_FIXTURE;
    setCalRows(fixture.calRows);
    setTimePoints(fixture.timePoints);

    // 1. PO Standards
    const poStds: PoStandardRow[] = fixture.kineticRows
      .filter((r) => r.type === 'standard')
      .map((r) => ({
        id: r.id,
        standardEu: r.standardEu || '0.0',
        name: r.name,
        readings: r.readings,
      }));
    setPoStandardRows(poStds);

    // 2. Coagulation Curve Fit
    const fit = chooseModel(fixture.calibrationPoints, 'linear');
    const newCal: CalibrationModelFit = {
      ...fit,
      model: 'linear',
      requestedModel: 'linear',
      points: fixture.calibrationPoints,
      meta: fixture.calibrationMeta,
      xMin: 0,
      xMax: 5,
    };
    setCalibration(newCal);

    // 3. PO Curve Fit
    const stdKinRows: KineticSampleRow[] = fixture.kineticRows.filter((r) => r.type === 'standard');
    const { results: stdKResults, model: fittedModel } = computeKineticRates(
      fixture.timePoints,
      stdKinRows,
      threshold,
      runLabel
    );
    setPoStandardResults(stdKResults);
    setKineticModel(fittedModel);

    // 4. Coagulation Samples
    setCoagRows(fixture.sampleRows);

    // 5. Phenoloxidase Samples
    const poSmpRows: PoSampleRow[] = fixture.kineticRows
      .filter((r) => r.type === 'sample')
      .map((r) => ({
        id: r.id,
        sampleId: r.sampleId,
        name: r.name,
        inputMode: r.inputMode,
        directRate: r.directRate,
        readings: r.readings,
      }));
    setPoRows(poSmpRows);

    // 6. Coagulation Estimates
    const validSamples = fixture.sampleRows.map((r, idx) => {
      const absVal = parseFloat(r.abs);
      const summary = summarizeReplicates(absVal, r.replicates);
      return {
        id: r.id,
        sampleId: (r.sampleId && r.sampleId.trim()) || '',
        name: r.name,
        abs: summary.mean,
        sd: summary.sd,
        cv: summary.cv,
        n: summary.n,
        replicates: summary.values,
        dilutionFactor: parseFloat(r.dilutionFactor || '1'),
      };
    });
    const sampEstimates = computeSampleEstimates(newCal, validSamples, threshold, runLabel);
    setSampleResults(sampEstimates);

    // 7. PO Estimates
    const { results: allKResults } = computeKineticRates(
      fixture.timePoints,
      fixture.kineticRows,
      threshold,
      runLabel
    );
    setKineticResults(allKResults.filter((r) => r.type === 'sample'));
  };

  // CSV Downloads
  const handleDownloadCsv = () => {
    if (!sampleResults.length && !kineticResults.length) {
      alert('Please estimate sample concentrations first.');
      return;
    }

    const csv = formatCoagulationCsv({
      results: sampleResults,
      calibration,
      runLabel,
      threshold,
      thresholdBasis: 'Investigational Study Decision Threshold',
      wavelength: wavelengths.coagulation,
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `coagulation_endotoxin_${runLabel
      .toLowerCase()
      .replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadKineticCsv = () => {
    if (!kineticResults.length) {
      alert('Please compute kinetic rates first.');
      return;
    }

    const csv = formatKineticCsv({
      results: kineticResults,
      model: kineticModel,
      runLabel,
      threshold,
      wavelength: wavelengths.phenoloxidase,
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `phenoloxidase_kinetics_${runLabel
      .toLowerCase()
      .replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadComparisonCsv = () => {
    if (!comparisons.length) {
      alert('No cross-assay comparison data available yet.');
      return;
    }

    const csv = formatComparisonCsv({
      comparisons,
      runLabel,
      pairingSummary,
      coagWavelength: wavelengths.coagulation,
      poWavelength: wavelengths.phenoloxidase,
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orthogonal_assay_concordance_${runLabel
      .toLowerCase()
      .replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col transition-colors">
      <Header
        runLabel={runLabel}
        setRunLabel={setRunLabel}
        wavelengths={wavelengths}
        setWavelengths={setWavelengths}
        onGoToReport={() => setActiveTab('rep')}
        onOpenLabManual={() => setIsLabManualOpen(true)}
        themePreference={preference}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Quick Action Fixture Banner */}
        <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs no-print">
          <div className="flex items-center gap-2">
            <span className="font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-tight">
              Rapid Study Benchmark:
            </span>
            <span className="text-slate-600 dark:text-slate-300">
              Deterministic CLSI EP09-A3 study fixture (Coagulation &amp; Phenoloxidase).
            </span>
          </div>
          <button
            onClick={handleLoadFullDualAssayStudy}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition shadow-2xs cursor-pointer shrink-0"
          >
            Load Full Dual-Assay Study
          </button>
        </div>

        {/* Tab Rail */}
        <nav className="flex items-center gap-4 sm:gap-6 border-b border-slate-200 dark:border-slate-800 text-xs font-medium no-print overflow-x-auto">
          <button
            onClick={() => setActiveTab('cal')}
            className={`pb-2.5 px-1 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'cal'
                ? 'border-indigo-600 dark:border-indigo-500 text-slate-900 dark:text-slate-100 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            1. Coagulation Curve
          </button>
          <button
            onClick={() => setActiveTab('po')}
            className={`pb-2.5 px-1 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'po'
                ? 'border-indigo-600 dark:border-indigo-500 text-slate-900 dark:text-slate-100 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            2. PO Kinetic Curve
          </button>
          <button
            onClick={() => setActiveTab('est')}
            className={`pb-2.5 px-1 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'est'
                ? 'border-indigo-600 dark:border-indigo-500 text-slate-900 dark:text-slate-100 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            3. Sample Estimator
          </button>
          <button
            onClick={() => setActiveTab('cmp')}
            className={`pb-2.5 px-1 border-b-2 transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'cmp'
                ? 'border-indigo-600 dark:border-indigo-500 text-slate-900 dark:text-slate-100 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>4. Cross-Assay Concordance</span>
            {comparisons.length > 0 && (
              <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-emerald-200 dark:border-emerald-800">
                {comparisons.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('rep')}
            className={`pb-2.5 px-1 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'rep'
                ? 'border-indigo-600 dark:border-indigo-500 text-slate-900 dark:text-slate-100 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            5. Validation Report
          </button>
        </nav>

        {/* Tab Views */}
        <div>
          {/* Active view in screen mode */}
          <div className="no-print">
            {activeTab === 'cal' && (
              <StandardCurveTab
                rows={calRows}
                setRows={setCalRows}
                model={model}
                setModel={(m) => setModel(m as 'linear' | 'quadratic')}
                calibration={calibration}
                coagWavelength={wavelengths.coagulation}
                setCoagWavelength={(w) =>
                  setWavelengths((prev) => ({ ...prev, coagulation: w }))
                }
                onCompute={handleComputeCalibration}
                onClear={handleClearCal}
                runLabel={runLabel}
                onLoadExample={handleLoadExampleCal}
                errorMessage={coagCurveError}
              />
            )}

            {activeTab === 'po' && (
              <PhenoloxidaseCurveTab
                timePoints={timePoints}
                setTimePoints={setTimePoints}
                rows={poStandardRows}
                setRows={setPoStandardRows}
                model={kineticModel}
                standardResults={poStandardResults}
                poWavelength={wavelengths.phenoloxidase}
                setPoWavelength={(w) =>
                  setWavelengths((prev) => ({ ...prev, phenoloxidase: w }))
                }
                onCompute={handleComputePoCurve}
                onClear={handleClearPoCurve}
                onLoadExample={handleLoadExamplePoCurve}
                onDownloadCsv={handleDownloadKineticCsv}
                onGoToEstimator={() => setActiveTab('est')}
                errorMessage={poCurveError}
              />
            )}

            {activeTab === 'est' && (
              <SampleEstimatorTab
                coagRows={coagRows}
                setCoagRows={setCoagRows}
                poRows={poRows}
                setPoRows={setPoRows}
                calibration={calibration}
                kineticModel={kineticModel}
                timePoints={timePoints}
                coagWavelength={wavelengths.coagulation}
                poWavelength={wavelengths.phenoloxidase}
                coagResults={sampleResults}
                poResults={kineticResults}
                comparisons={comparisons}
                pairingSummary={pairingSummary}
                threshold={threshold}
                setThreshold={setThreshold}
                onEstimateAll={handleEstimateAll}
                onEstimateCoag={handleEstimateCoag}
                onEstimatePo={handleEstimatePo}
                onClearAll={handleClearSamples}
                onDownloadCsv={handleDownloadCsv}
                onLoadExample={handleLoadExampleSamples}
                onGoToConcordance={() => setActiveTab('cmp')}
                onGoToCoagCurve={() => setActiveTab('cal')}
                onGoToPoCurve={() => setActiveTab('po')}
                errorMessage={estimateError}
              />
            )}

            {activeTab === 'cmp' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
                <DualAssayComparisonSection
                  comparisons={comparisons}
                  pairingSummary={pairingSummary}
                  onDownloadCsv={handleDownloadComparisonCsv}
                  isPrintView={false}
                />
              </div>
            )}

            {activeTab === 'rep' && (
              <ValidationReportTab
                runLabel={runLabel}
                calibration={calibration}
                results={sampleResults}
                kineticResults={kineticResults}
                kineticModel={kineticModel}
                comparisons={comparisons}
                pairingSummary={pairingSummary}
                threshold={threshold}
                wavelengths={wavelengths}
                onPrint={handlePrint}
                onDownloadCoagCsv={handleDownloadCsv}
                onDownloadKineticCsv={handleDownloadKineticCsv}
                onDownloadComparisonCsv={handleDownloadComparisonCsv}
              />
            )}
          </div>

          {/* Dedicated Print View */}
          <div className="hidden print:block space-y-8">
            <ValidationReportTab
              runLabel={runLabel}
              calibration={calibration}
              results={sampleResults}
              kineticResults={kineticResults}
              kineticModel={kineticModel}
              comparisons={comparisons}
              pairingSummary={pairingSummary}
              threshold={threshold}
              wavelengths={wavelengths}
              onPrint={handlePrint}
            />
          </div>
        </div>
      </main>

      <LabManualModal
        isOpen={isLabManualOpen}
        onClose={() => setIsLabManualOpen(false)}
      />
    </div>
  );
}
