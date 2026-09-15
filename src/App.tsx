import { useState, useEffect } from 'react';
import {
  CalibrationRow,
  SampleRow,
  CalibrationModelFit,
  SampleEstimateResult,
  KineticSampleRow,
  KineticResult,
  KineticCalibrationModel,
  AssayComparisonItem,
  WavelengthSettings,
} from './types';
import {
  chooseModel,
  summarizeReplicates,
  computeSampleEstimates,
  computeKineticRates,
  computeAssayComparison,
} from './utils/math';
import { formatCoagulationCsv, formatKineticCsv, formatComparisonCsv } from './utils/csv';
import { DETERMINISTIC_STUDY_FIXTURE } from './data/studyFixtures';
import { Header } from './components/Header';
import { StandardCurveTab } from './components/StandardCurveTab';
import { SampleEstimatorTab } from './components/SampleEstimatorTab';
import { PhenoloxidaseTab } from './components/PhenoloxidaseTab';
import { DualAssayComparisonSection } from './components/DualAssayComparisonSection';
import { ValidationReportTab } from './components/ValidationReportTab';
import { LabManualModal } from './components/LabManualModal';
import { FAVICON_COLLECTION, applyFaviconToDocument } from './data/favicons';
import { useTheme } from './utils/theme';
import { GitCompare } from 'lucide-react';

const EMPTY_CAL_ROWS: CalibrationRow[] = [
  { id: '1', eu: '', abs: '', replicates: '' },
  { id: '2', eu: '', abs: '', replicates: '' },
  { id: '3', eu: '', abs: '', replicates: '' },
  { id: '4', eu: '', abs: '', replicates: '' },
];

const EMPTY_SAMPLE_ROWS: SampleRow[] = [
  { id: 's1', sampleId: 'S1', name: '', abs: '', replicates: '', dilutionFactor: '1' },
  { id: 's2', sampleId: 'S2', name: '', abs: '', replicates: '', dilutionFactor: '1' },
  { id: 's3', sampleId: 'S3', name: '', abs: '', replicates: '', dilutionFactor: '1' },
];

const EXAMPLE_CAL_ROWS: CalibrationRow[] = [
  { id: '1', eu: '0', abs: '0.005', replicates: '' },
  { id: '2', eu: '0.5', abs: '0.048', replicates: '0.047, 0.049' },
  { id: '3', eu: '2.0', abs: '0.185', replicates: '0.184, 0.186' },
  { id: '4', eu: '5.0', abs: '0.452', replicates: '0.450, 0.454' },
];

const EXAMPLE_SAMPLE_ROWS: SampleRow[] = [
  { id: 's1', sampleId: 'S1', name: 'Commercial Infusion A', abs: '0.082', replicates: '0.081, 0.083', dilutionFactor: '1' },
  { id: 's2', sampleId: 'S2', name: 'Sterile Water Control', abs: '0.008', replicates: '', dilutionFactor: '1' },
  { id: 's3', sampleId: 'S3', name: 'Commercial Infusion B', abs: '0.310', replicates: '0.308, 0.312', dilutionFactor: '1' },
];

const DEFAULT_TIME_POINTS = [0, 2, 4, 6, 8, 10];

const EMPTY_KINETIC_ROWS: KineticSampleRow[] = [
  { id: 'k1', sampleId: 'STD0', name: '', type: 'standard', standardEu: '0.0', readings: {} },
  { id: 'k2', sampleId: 'STD1', name: '', type: 'standard', standardEu: '1.0', readings: {} },
  { id: 'k3', sampleId: 'S1', name: '', type: 'sample', readings: {} },
];

const EXAMPLE_KINETIC_ROWS: KineticSampleRow[] = [
  {
    id: 'k_std0',
    sampleId: 'STD0',
    name: 'Standard Blank 0.0 EU',
    type: 'standard',
    standardEu: '0.0',
    readings: { 0: '0.010', 2: '0.011', 4: '0.011', 6: '0.012', 8: '0.012', 10: '0.013' },
  },
  {
    id: 'k_std1',
    sampleId: 'STD1',
    name: 'Standard 0.5 EU/mL',
    type: 'standard',
    standardEu: '0.5',
    readings: { 0: '0.020', 2: '0.027', 4: '0.035', 6: '0.043', 8: '0.050', 10: '0.058' },
  },
  {
    id: 'k_std2',
    sampleId: 'STD2',
    name: 'Standard 2.0 EU/mL',
    type: 'standard',
    standardEu: '2.0',
    readings: { 0: '0.030', 2: '0.058', 4: '0.086', 6: '0.114', 8: '0.142', 10: '0.170' },
  },
  {
    id: 'k_std3',
    sampleId: 'STD3',
    name: 'Standard 5.0 EU/mL',
    type: 'standard',
    standardEu: '5.0',
    readings: { 0: '0.045', 2: '0.115', 4: '0.185', 6: '0.255', 8: '0.325', 10: '0.395' },
  },
  {
    id: 'k_s1',
    sampleId: 'S1',
    name: 'Commercial Infusion A',
    type: 'sample',
    readings: { 0: '0.025', 2: '0.038', 4: '0.052', 6: '0.065', 8: '0.078', 10: '0.091' },
  },
  {
    id: 'k_s2',
    sampleId: 'S2',
    name: 'Sterile Water Control',
    type: 'sample',
    readings: { 0: '0.010', 2: '0.011', 4: '0.010', 6: '0.012', 8: '0.011', 10: '0.013' },
  },
  {
    id: 'k_s3',
    sampleId: 'S3',
    name: 'Commercial Infusion B',
    type: 'sample',
    readings: { 0: '0.035', 2: '0.089', 4: '0.143', 6: '0.197', 8: '0.251', 10: '0.305' },
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'cal' | 'est' | 'po' | 'cmp' | 'rep'>('cal');
  const [runLabel, setRunLabel] = useState('Run 1');
  const [model, setModel] = useState<string>('linear');
  const [threshold, setThreshold] = useState<number>(0.5);

  // Wavelength Settings
  const [wavelengths, setWavelengths] = useState<WavelengthSettings>({
    coagulation: 540,
    phenoloxidase: 490,
  });

  // Calibration rows (Coagulation)
  const [calRows, setCalRows] = useState<CalibrationRow[]>(EMPTY_CAL_ROWS);
  const [sampleRows, setSampleRows] = useState<SampleRow[]>(EMPTY_SAMPLE_ROWS);
  const [calibration, setCalibration] = useState<CalibrationModelFit | null>(null);
  const [sampleResults, setSampleResults] = useState<SampleEstimateResult[]>([]);

  // Phenoloxidase kinetic state
  const [timePoints, setTimePoints] = useState<number[]>(DEFAULT_TIME_POINTS);
  const [kineticRows, setKineticRows] = useState<KineticSampleRow[]>(EMPTY_KINETIC_ROWS);
  const [kineticResults, setKineticResults] = useState<KineticResult[]>([]);
  const [kineticModel, setKineticModel] = useState<KineticCalibrationModel | null>(null);

  // Cross-Assay Concordance comparison items
  const [comparisons, setComparisons] = useState<AssayComparisonItem[]>([]);

  // Modals state
  const [isLabManualOpen, setIsLabManualOpen] = useState(false);
  const [activeFaviconId, setActiveFaviconId] = useState<string>('bio-flask');

  // Dark & Light theme state
  const { preference: themePreference, isDark, toggleTheme } = useTheme();

  // Load saved custom or selected favicon on startup
  useEffect(() => {
    try {
      const savedCustom = localStorage.getItem('endotoxin_custom_favicon');
      const savedId = localStorage.getItem('endotoxin_active_favicon_id');
      if (savedCustom && savedId === 'custom') {
        applyFaviconToDocument(savedCustom);
        setActiveFaviconId('custom');
      } else if (savedId) {
        const item = FAVICON_COLLECTION.find((f) => f.id === savedId);
        if (item) {
          applyFaviconToDocument(item.svg);
          setActiveFaviconId(savedId);
        }
      }
    } catch {
      // storage exception safe
    }
  }, []);

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
      const x = parseFloat(row.eu);
      const meanAbs = parseFloat(row.abs);
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
      alert('Please enter at least two calibration points with valid EU/mL and absorbance values.');
      return;
    }

    const uniqueEU = new Set(pts.map((p) => p[0]));
    if (uniqueEU.size < 2) {
      alert('Calibration requires at least two distinct concentration standards.');
      return;
    }

    const fit = chooseModel(pts, model);
    if (!fit.isValidCalibration) {
      alert(`Calibration rejected: ${fit.validationErrors?.join('; ') || 'Invalid calibration curve.'}`);
      return;
    }

    const xMin = Math.min(...pts.map((p) => p[0]));
    const xMax = Math.max(...pts.map((p) => p[0]));

    const newCalibration: CalibrationModelFit = {
      ...fit,
      model: fit.type,
      requestedModel: model,
      points: pts,
      meta,
      xMin,
      xMax,
    };

    setCalibration(newCalibration);
  };

  // Compute sample estimates whenever calibration or samples change
  const handleEstimateSamples = () => {
    if (!calibration) {
      alert('Please compute the calibration curve first.');
      return;
    }

    const validSamples: {
      id?: string;
      sampleId?: string;
      name: string;
      abs: number;
      sd: number;
      cv: number;
      n: number;
      replicates: number[];
      dilutionFactor?: number;
    }[] = [];

    sampleRows.forEach((row, idx) => {
      const meanAbs = parseFloat(row.abs);
      if (!row.name.trim() || !Number.isFinite(meanAbs)) return;

      const summary = summarizeReplicates(meanAbs, row.replicates);
      if (Number.isFinite(summary.mean)) {
        validSamples.push({
          id: row.id,
          sampleId: row.sampleId || `S${idx + 1}`,
          name: row.name.trim(),
          abs: summary.mean,
          sd: summary.sd,
          cv: summary.cv,
          n: summary.n,
          replicates: summary.values,
          dilutionFactor: row.dilutionFactor ? parseFloat(row.dilutionFactor) : 1,
        });
      }
    });

    if (validSamples.length === 0) {
      alert('Please enter at least one sample with a name and absorbance value.');
      return;
    }

    const estimates = computeSampleEstimates(calibration, validSamples, threshold, runLabel);
    setSampleResults(estimates);
  };

  // Keep estimates updated whenever calibration, sampleRows, threshold, or runLabel changes
  useEffect(() => {
    if (calibration) {
      const validSamples = sampleRows
        .map((row, idx) => {
          const meanAbs = parseFloat(row.abs);
          if (!row.name.trim() || !Number.isFinite(meanAbs)) return null;
          const summary = summarizeReplicates(meanAbs, row.replicates);
          if (!Number.isFinite(summary.mean)) return null;
          return {
            id: row.id,
            sampleId: row.sampleId || `S${idx + 1}`,
            name: row.name.trim(),
            abs: summary.mean,
            sd: summary.sd,
            cv: summary.cv,
            n: summary.n,
            replicates: summary.values,
            dilutionFactor: row.dilutionFactor ? parseFloat(row.dilutionFactor) : 1,
          };
        })
        .filter((v): v is NonNullable<typeof v> => v !== null);

      if (validSamples.length > 0) {
        setSampleResults(computeSampleEstimates(calibration, validSamples, threshold, runLabel));
      } else {
        setSampleResults([]);
      }
    }
  }, [calibration, sampleRows, threshold, runLabel]);

  // Compute Phenoloxidase Kinetic Rates & Standard Curve
  const handleComputeKinetics = () => {
    const validRows = kineticRows.filter((r) => r.name.trim() !== '');
    if (validRows.length === 0) {
      alert('Please enter at least one fraction/sample name and absorbance time readings.');
      return;
    }

    const { results, model: fittedModel } = computeKineticRates(timePoints, validRows, threshold, runLabel);
    const validCount = results.filter((r) => r.valid).length;
    if (validCount === 0) {
      alert('Could not compute kinetics: Please ensure at least 2 time points have valid numerical absorbance readings.');
      return;
    }

    setKineticResults(results);
    setKineticModel(fittedModel);
  };

  const handleClearCal = () => {
    setCalRows(EMPTY_CAL_ROWS);
    setCalibration(null);
  };

  const handleLoadExampleCal = () => {
    setCalRows(EXAMPLE_CAL_ROWS);
  };

  const handleClearSamples = () => {
    setSampleRows(EMPTY_SAMPLE_ROWS);
    setSampleResults([]);
  };

  const handleLoadExampleSamples = () => {
    setSampleRows(EXAMPLE_SAMPLE_ROWS);
  };

  const handleClearKinetics = () => {
    setKineticRows(EMPTY_KINETIC_ROWS);
    setKineticResults([]);
    setKineticModel(null);
  };

  const handleLoadExampleKinetics = () => {
    setTimePoints(DEFAULT_TIME_POINTS);
    setKineticRows(EXAMPLE_KINETIC_ROWS);
    const { results, model: fittedModel } = computeKineticRates(
      DEFAULT_TIME_POINTS,
      EXAMPLE_KINETIC_ROWS
    );
    setKineticResults(results);
    setKineticModel(fittedModel);
  };

  // One-click dual-assay study loader (deterministic, synchronous, zero-delay)
  const handleLoadFullDualAssayStudy = () => {
    const fixture = DETERMINISTIC_STUDY_FIXTURE;
    setCalRows(fixture.calRows);
    setSampleRows(fixture.sampleRows);
    setTimePoints(fixture.timePoints);
    setKineticRows(fixture.kineticRows);

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

    const validSamples = fixture.sampleRows.map((r, idx) => {
      const absVal = parseFloat(r.abs);
      const summary = summarizeReplicates(absVal, r.replicates);
      return {
        id: r.id,
        sampleId: r.sampleId || `S${idx + 1}`,
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

    const { results: kResults, model: fittedModel } = computeKineticRates(
      fixture.timePoints,
      fixture.kineticRows,
      threshold,
      runLabel
    );
    setKineticResults(kResults);
    setKineticModel(fittedModel);
  };

  const handleDownloadCsv = () => {
    if (!sampleResults.length) {
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
        themePreference={themePreference}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />

      <div className="flex-1 max-w-[1180px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Title Header & Global Quick Actions */}
        <div className="no-print flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-bold mb-0.5">
              Hemolymph Endotoxin Assay Suite
            </p>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Endotoxin Assay Calibration &amp; Dual-Assay Validation
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <em>Archachatina marginata</em> calibration, commercial fluid estimation, phenoloxidase kinetics &amp; orthogonal concordance.
            </p>
          </div>

          <button
            onClick={handleLoadFullDualAssayStudy}
            className="px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-lg transition shadow-2xs self-start sm:self-auto cursor-pointer"
            title="Populate complete dual-assay dataset across Coagulation and Phenoloxidase for immediate comparison"
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
            onClick={() => setActiveTab('est')}
            className={`pb-2.5 px-1 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'est'
                ? 'border-indigo-600 dark:border-indigo-500 text-slate-900 dark:text-slate-100 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            2. Coagulation Estimator
          </button>
          <button
            onClick={() => setActiveTab('po')}
            className={`pb-2.5 px-1 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'po'
                ? 'border-indigo-600 dark:border-indigo-500 text-slate-900 dark:text-slate-100 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            3. PO Kinetics &amp; EU/mL
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
                setModel={setModel}
                calibration={calibration}
                coagWavelength={wavelengths.coagulation}
                setCoagWavelength={(w) =>
                  setWavelengths((prev) => ({ ...prev, coagulation: w }))
                }
                onCompute={handleComputeCalibration}
                onClear={handleClearCal}
                runLabel={runLabel}
                onLoadExample={handleLoadExampleCal}
              />
            )}

            {activeTab === 'est' && (
              <SampleEstimatorTab
                rows={sampleRows}
                setRows={setSampleRows}
                calibration={calibration}
                coagWavelength={wavelengths.coagulation}
                results={sampleResults}
                threshold={threshold}
                setThreshold={setThreshold}
                onEstimate={handleEstimateSamples}
                onClear={handleClearSamples}
                onDownloadCsv={handleDownloadCsv}
                onLoadExample={handleLoadExampleSamples}
              />
            )}

            {activeTab === 'po' && (
              <PhenoloxidaseTab
                timePoints={timePoints}
                setTimePoints={setTimePoints}
                rows={kineticRows}
                setRows={setKineticRows}
                results={kineticResults}
                model={kineticModel}
                poWavelength={wavelengths.phenoloxidase}
                setPoWavelength={(w) =>
                  setWavelengths((prev) => ({ ...prev, phenoloxidase: w }))
                }
                coagResults={sampleResults}
                onCompute={handleComputeKinetics}
                onClear={handleClearKinetics}
                onLoadExample={handleLoadExampleKinetics}
                onDownloadCsv={handleDownloadKineticCsv}
                onGoToCompare={() => setActiveTab('cmp')}
              />
            )}

            {activeTab === 'cmp' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
                <DualAssayComparisonSection
                  comparisons={comparisons}
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
                threshold={threshold}
                wavelengths={wavelengths}
                onPrint={handlePrint}
                onDownloadCoagCsv={handleDownloadCsv}
                onDownloadKineticCsv={handleDownloadKineticCsv}
                onDownloadComparisonCsv={handleDownloadComparisonCsv}
              />
            )}
          </div>

          {/* Print container: In print mode, ALWAYS show the Validation Report cleanly */}
          <div className="hidden print:block">
            <ValidationReportTab
              runLabel={runLabel}
              calibration={calibration}
              results={sampleResults}
              kineticResults={kineticResults}
              kineticModel={kineticModel}
              comparisons={comparisons}
              threshold={threshold}
              wavelengths={wavelengths}
              onPrint={handlePrint}
            />
          </div>
        </div>
      </div>

      {/* Lab Manual & SOP Documentation Modal */}
      <LabManualModal
        isOpen={isLabManualOpen}
        onClose={() => setIsLabManualOpen(false)}
      />
    </div>
  );
}

