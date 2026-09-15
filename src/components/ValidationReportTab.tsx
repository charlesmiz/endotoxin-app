import React, { useState } from 'react';
import Markdown from 'react-markdown';
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
  ChevronDown,
  UserCheck,
  Info,
  RefreshCw,
  AlertCircle,
  Loader2,
  Cpu,
  BookOpen,
  ExternalLink,
} from 'lucide-react';
import { generateAnalyticalInterpretation } from '../utils/analyticalFallback';

interface ValidationReportTabProps {
  runLabel: string;
  experimentId?: string;
  calibration: CalibrationModelFit | null;
  results: SampleEstimateResult[];
  kineticResults?: KineticResult[];
  kineticModel?: KineticCalibrationModel | null;
  comparisons?: AssayComparisonItem[];
  threshold: number;
  thresholdBasis?: string;
  wavelengths?: WavelengthSettings;
  onPrint: () => void;
  onDownloadCoagCsv?: () => void;
  onDownloadKineticCsv?: () => void;
  onDownloadComparisonCsv?: () => void;
}

export const ValidationReportTab: React.FC<ValidationReportTabProps> = ({
  runLabel,
  experimentId = 'EXP-AM-2026-001',
  calibration,
  results,
  kineticResults = [],
  kineticModel = null,
  comparisons = [],
  threshold,
  thresholdBasis = 'Investigational research decision threshold',
  wavelengths = { coagulation: 540, phenoloxidase: 490 },
  onPrint,
  onDownloadCoagCsv,
  onDownloadKineticCsv,
  onDownloadComparisonCsv,
}) => {
  const [reportScope, setReportScope] = useState<'all' | 'coag' | 'po' | 'compare'>('all');
  const [showComparison, setShowComparison] = useState<boolean>(true);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Signatory & Approval Metadata with local storage persistence
  const [analystName, setAnalystName] = useState(() => {
    try {
      return localStorage.getItem('endotoxin_analyst_name') || '';
    } catch {
      return '';
    }
  });
  const [analystDate, setAnalystDate] = useState(() => {
    try {
      return localStorage.getItem('endotoxin_analyst_date') || new Date().toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  });
  const [supervisorName, setSupervisorName] = useState(() => {
    try {
      return localStorage.getItem('endotoxin_supervisor_name') || '';
    } catch {
      return '';
    }
  });
  const [supervisorDate, setSupervisorDate] = useState(() => {
    try {
      return localStorage.getItem('endotoxin_supervisor_date') || new Date().toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  });

  const handleAnalystNameChange = (val: string) => {
    setAnalystName(val);
    try { localStorage.setItem('endotoxin_analyst_name', val); } catch {}
  };
  const handleAnalystDateChange = (val: string) => {
    setAnalystDate(val);
    try { localStorage.setItem('endotoxin_analyst_date', val); } catch {}
  };
  const handleSupervisorNameChange = (val: string) => {
    setSupervisorName(val);
    try { localStorage.setItem('endotoxin_supervisor_name', val); } catch {}
  };
  const handleSupervisorDateChange = (val: string) => {
    setSupervisorDate(val);
    try { localStorage.setItem('endotoxin_supervisor_date', val); } catch {}
  };

  // AI-Powered "Explain this result" state
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [explanationText, setExplanationText] = useState<string | null>(null);
  const [explanationError, setExplanationError] = useState<string | null>(null);
  const [isFallbackExplanation, setIsFallbackExplanation] = useState(false);
  const [sourceModel, setSourceModel] = useState<string>('');

  // N2: Supporting-Literature Lookup state
  const [isLoadingLiterature, setIsLoadingLiterature] = useState(false);
  const [literatureData, setLiteratureData] = useState<{
    papers: Array<{
      title: string;
      authors?: string[];
      year?: number;
      abstract?: string;
      url?: string;
      citationCount?: number;
    }>;
    synthesis: string;
    query: string;
    isRateLimited: boolean;
    retrievalSource: string;
  } | null>(null);
  const [literatureError, setLiteratureError] = useState<string | null>(null);

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

  const formatFriendlyError = (raw: string): string => {
    if (!raw) return 'An error occurred while communicating with the AI service. Please retry.';
    try {
      const parsed = JSON.parse(raw);
      if (parsed.error?.message) {
        return parsed.error.message;
      }
      if (parsed.message) {
        return parsed.message;
      }
    } catch {
      // Not pure JSON, check if contains a substring with error message
      const match = raw.match(/"message"\s*:\s*"([^"]+)"/);
      if (match && match[1]) {
        return match[1];
      }
    }
    if (raw.includes('503') || raw.includes('UNAVAILABLE') || raw.includes('high demand')) {
      return 'The AI service is currently experiencing temporary high demand spikes upstream. You can retry in a moment, or generate a comprehensive local analytical synthesis immediately.';
    }
    return raw;
  };

  const buildSummaryPayload = () => ({
    runLabel,
    threshold,
    wavelengths,
    calibration: calibration
      ? {
          r2: calibration.r2,
          slope: calibration.slope,
          intercept: calibration.intercept,
          type: calibration.type,
          pointsCount: calibration.points.length,
        }
      : null,
    coagSamples: results.map((r) => ({
      name: r.name,
      abs: r.abs,
      eu: r.eu,
      n: r.n,
      cv: r.cv,
      status: r.status,
    })),
    kineticModel: kineticModel
      ? {
          r2: kineticModel.r2,
          slope: kineticModel.slope,
          intercept: kineticModel.intercept,
        }
      : null,
    kineticSamples: validKinetic.map((k) => ({
      name: k.name,
      type: k.type,
      rate: k.rate,
      r2: k.r2,
      estimatedEu: k.estimatedEu,
      activityLevel: k.activityLevel,
    })),
    comparisons: comparisons.map((c) => ({
      name: c.name,
      coagEu: c.coagEu,
      poEu: c.poEu,
      absDiff: c.absDiff,
      rpd: c.rpd,
      ratio: c.ratio,
      concordance: c.concordance,
    })),
  });

  const handleGenerateLocalFallback = () => {
    const payload = buildSummaryPayload();
    const text = generateAnalyticalInterpretation(payload);
    setExplanationText(text);
    setIsFallbackExplanation(true);
    setSourceModel('local-analytical-engine');
    setExplanationError(null);
  };

  const handleExplainResult = async () => {
    setIsLoadingExplanation(true);
    setExplanationError(null);
    try {
      const payload = buildSummaryPayload();

      const response = await fetch('/api/explain-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok && !data.explanation) {
        throw new Error(data.error || 'Failed to generate AI analytical explanation');
      }

      setExplanationText(data.explanation);
      setIsFallbackExplanation(Boolean(data.isFallback));
      setSourceModel(data.sourceModel || (data.isFallback ? 'rule-based-engine' : 'gemini'));
    } catch (err: any) {
      console.error('Explain result error:', err);
      const friendly = formatFriendlyError(err?.message || '');
      setExplanationError(friendly);
    } finally {
      setIsLoadingExplanation(false);
    }
  };

  const handleLookupLiterature = async () => {
    setIsLoadingLiterature(true);
    setLiteratureError(null);
    try {
      const response = await fetch('/api/lookup-literature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'Archachatina marginata hemolymph endotoxin detection phenoloxidase coagulation',
          assayContext: {
            coagWavelength: wavelengths.coagulation,
            poWavelength: wavelengths.phenoloxidase,
            coagR2: calibration?.r2,
            poR2: kineticModel?.r2,
            sampleCount: results.length,
            threshold: threshold,
            thresholdBasis: thresholdBasis,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete literature retrieval');
      }
      setLiteratureData(data);
    } catch (err: any) {
      console.error('Literature lookup error:', err);
      setLiteratureError(err?.message || 'Failed to complete supporting literature lookup');
    } finally {
      setIsLoadingLiterature(false);
    }
  };

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
      {/* Signatory & Approval Metadata Setup (Screen Only) */}
      <div className="no-print bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 dark:border-slate-800 pb-2">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Reviewer &amp; Analyst Attribution Setup (Metadata Only — Non-authenticated)
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Populates research attribution lines below (saved in local storage; not a regulatory signature)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Student / Analyst Name
            </label>
            <input
              type="text"
              value={analystName}
              onChange={(e) => handleAnalystNameChange(e.target.value)}
              placeholder="e.g. Jane Doe, B.Sc. Candidate"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-medium outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Analyst Date
            </label>
            <input
              type="date"
              value={analystDate}
              onChange={(e) => handleAnalystDateChange(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-medium outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Supervisor Name
            </label>
            <input
              type="text"
              value={supervisorName}
              onChange={(e) => handleSupervisorNameChange(e.target.value)}
              placeholder="e.g. Dr. A. Johnson, Ph.D."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-medium outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Supervisor Review Date
            </label>
            <input
              type="date"
              value={supervisorDate}
              onChange={(e) => handleSupervisorDateChange(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-medium outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Control & Filter Toolbar (Screen Only) */}
      <div className="no-print bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mr-1">
            <Filter className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Report Content:
          </span>

          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
            <button
              onClick={() => setReportScope('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                reportScope === 'all'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Full Research Analysis Report
            </button>
            <button
              onClick={() => setReportScope('coag')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                reportScope === 'coag'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Coagulation Only
            </button>
            <button
              onClick={() => setReportScope('po')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                reportScope === 'po'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Phenoloxidase Only
            </button>
            {hasComparison && (
              <button
                onClick={() => setReportScope('compare')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                  reportScope === 'compare'
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Method Comparison Only
              </button>
            )}
          </div>

          {reportScope === 'all' && hasComparison && (
            <label className="flex items-center gap-1.5 ml-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showComparison}
                onChange={(e) => setShowComparison(e.target.checked)}
                className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 dark:border-slate-700 focus:ring-indigo-500"
              />
              <span>Include Exploratory Method Comparison Section</span>
            </label>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 relative">
          {/* AI Explain Button */}
          <button
            onClick={handleExplainResult}
            disabled={isLoadingExplanation}
            className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold shadow-2xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Generate plain-language explanation of assay status and method comparison"
          >
            {isLoadingExplanation ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                <span>Explaining...</span>
              </>
            ) : (
              <span>Explain Result</span>
            )}
          </button>

          {/* Supporting Literature Lookup Button */}
          <button
            onClick={handleLookupLiterature}
            disabled={isLoadingLiterature}
            className="px-3.5 py-2 bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 rounded-lg text-xs font-bold shadow-2xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Search Semantic Scholar and synthesize supporting published literature"
          >
            {isLoadingLiterature ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600 dark:text-teal-400" />
                <span>Searching Literature...</span>
              </>
            ) : (
              <>
                <BookOpen className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>See Supporting Literature</span>
              </>
            )}
          </button>

          {/* Export CSV Options */}
          <div className="relative">
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Export CSV</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isExportMenuOpen && (
              <div
                className="absolute right-0 mt-1.5 w-60 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1.5 z-20"
                onClick={() => setIsExportMenuOpen(false)}
              >
                {onDownloadCoagCsv && (
                  <button
                    onClick={onDownloadCoagCsv}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                  >
                    <FlaskConical className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Download Coagulation CSV</span>
                  </button>
                )}
                {onDownloadKineticCsv && (
                  <button
                    onClick={onDownloadKineticCsv}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                  >
                    <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Download Phenoloxidase CSV</span>
                  </button>
                )}
                {onDownloadComparisonCsv && hasComparison && (
                  <button
                    onClick={onDownloadComparisonCsv}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer border-t border-slate-100 dark:border-slate-700"
                  >
                    <GitCompare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Download Method Comparison CSV</span>
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
      <article className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 sm:p-8 md:p-10 space-y-6 print-only-active text-slate-900 dark:text-slate-100 transition-colors">
        {/* Header Section */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b-2 border-indigo-600 print-compact-space avoid-break">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
              <FlaskConical className="w-6 h-6 shrink-0" />
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {reportScope === 'coag'
                  ? 'Coagulation Assay Research Report'
                  : reportScope === 'po'
                  ? 'Phenoloxidase Kinetic Research Report'
                  : reportScope === 'compare'
                  ? 'Exploratory Method Comparison Report'
                  : 'Research Analysis Report'}
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              <em>Archachatina marginata</em> hemolymph bioassay &bull; Research &amp; Educational Study &bull; &lambda;<sub>coag</sub>={wavelengths.coagulation}nm &bull; &lambda;<sub>PO</sub>={wavelengths.phenoloxidase}nm
            </p>
          </div>
          <div className="text-left sm:text-right space-y-0.5 text-xs">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Run ID &bull; Experiment ID
            </div>
            <div className="font-semibold text-slate-900 dark:text-slate-100 num text-sm">
              {runLabel || 'Run 1'} &bull; <span className="font-mono text-indigo-600 dark:text-indigo-400 text-xs">{experimentId}</span>
            </div>
            <div className="text-slate-500 dark:text-slate-400 num">{currentDate}</div>
          </div>
        </header>

        {/* Regulatory & Proof-of-Concept Neutrality Disclaimer Notice */}
        <div className="p-3 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <strong>Research &amp; Proof-of-Concept Statement:</strong> This application is a research and educational analysis tool. It does not establish clinical, regulatory, pharmacopeial, product-release, or patient-safety conclusions.
          </div>
        </div>

        {/* Comprehensive Metadata Header Grid (Section M) */}
        <section className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3.5 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Run &amp; Experiment ID</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{runLabel || 'Run 1'} / {experimentId}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Analysis Date / Time</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{currentDate}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Assay System</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">Coag ({wavelengths.coagulation} nm) &amp; PO ({wavelengths.phenoloxidase} nm)</span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Calibration Fit &amp; Range</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {calibration ? `${calibration.type.toUpperCase()} (${calibration.xMin.toFixed(2)}–${calibration.xMax.toFixed(2)} EU/mL)` : 'Not fitted'}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Study Decision Threshold</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{threshold.toFixed(2)} EU/mL</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate" title={thresholdBasis}>Basis: {thresholdBasis}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Sample Count (n)</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{results.length} unknowns ({validKinetic.length} kinetic)</span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Software Version</span>
            <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">v2.4.0 (Research Edition)</span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Evaluation Framework</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">Exploratory Method Comparison</span>
          </div>
        </section>

        {/* Executive Summary */}
        <section className="bg-indigo-50/60 dark:bg-indigo-950/30 border-l-4 border-indigo-600 p-4 rounded-r-lg avoid-break print-compact-space">
          <h2 className="text-xs uppercase tracking-wider text-indigo-900 dark:text-indigo-200 font-bold mb-1 flex items-center gap-1.5 avoid-break-after">
            <FileCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Executive Summary
          </h2>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
            {generateSummaryText()}
          </p>
        </section>

        {/* SECTION 1: COAGULATION ASSAY (If included) */}
        {showCoagSection && (
          <div className="space-y-6">
            {/* Calibration Statistics */}
            <section className="space-y-3 avoid-break print-compact-space">
              <div className="flex items-center justify-between">
                <h2 className="text-xs uppercase tracking-wider text-indigo-900 dark:text-indigo-200 font-bold avoid-break-after">
                  {reportScope === 'all' ? '1. ' : ''}Protein Coagulation Calibration Curve Performance
                </h2>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-medium">
                  &lambda; = {wavelengths.coagulation} nm
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">
                    R² Coefficient
                  </div>
                  <div className="text-base sm:text-lg font-bold num text-slate-900 dark:text-slate-100">
                    {calibration && Number.isFinite(calibration.r2)
                      ? calibration.r2.toFixed(4)
                      : '—'}
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">
                    Slope (Sensitivity)
                  </div>
                  <div className="text-base sm:text-lg font-bold num text-slate-900 dark:text-slate-100">
                    {calibration
                      ? calibration.type === 'linear'
                        ? calibration.slope?.toFixed(4) ?? '—'
                        : 'quadratic'
                      : '—'}
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">
                    Intercept (Blank)
                  </div>
                  <div className="text-base sm:text-lg font-bold num text-slate-900 dark:text-slate-100">
                    {calibration
                      ? calibration.type === 'linear'
                        ? calibration.intercept?.toFixed(4) ?? '—'
                        : calibration.c?.toFixed(4) ?? '—'
                      : '—'}
                  </div>
                </div>
              </div>

              <figure className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
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
              <h2 className="text-xs uppercase tracking-wider text-indigo-900 dark:text-indigo-200 font-bold avoid-break-after">
                {reportScope === 'all' ? '2. ' : ''}Commercial IV Fluid Sample Endotoxin Findings (Coagulation)
              </h2>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-[11px]">
                      <th className="px-3 py-2">Sample ID</th>
                      <th className="px-3 py-2">Mean Abs ({wavelengths.coagulation}nm)</th>
                      <th className="px-3 py-2">Estimated EU/mL</th>
                      <th className="px-3 py-2">Replicates</th>
                      <th className="px-3 py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
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
                            <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-200">
                              {r.name}
                            </td>
                            <td className="px-3 py-2 num text-slate-700 dark:text-slate-300">{r.abs.toFixed(4)}</td>
                            <td className="px-3 py-2 num font-bold text-slate-900 dark:text-slate-100">
                              {Number.isFinite(r.eu)
                                ? `${r.eu.toFixed(3)} EU/mL`
                                : '—'}
                            </td>
                            <td className="px-3 py-2 text-[11px] text-slate-500 dark:text-slate-400 num">
                              {r.n} {r.n === 1 ? 'val' : 'repl'}
                              {r.n > 1 &&
                                Number.isFinite(r.cv) &&
                                ` (CV ${r.cv.toFixed(1)}%)`}
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-[10px] uppercase">
                              <span
                                className={
                                  isAbove || r.invalidInput || r.negativeEstimate
                                    ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                    : 'text-emerald-700 dark:text-emerald-400 font-medium'
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
              <h2 className="text-xs uppercase tracking-wider text-indigo-900 dark:text-indigo-200 font-bold avoid-break-after flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                {reportScope === 'all' ? '3. ' : ''}Phenoloxidase (PO) Kinetic Rate &amp; Calibration Findings
              </h2>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-medium">
                &lambda; = {wavelengths.phenoloxidase} nm
              </span>
            </div>

            {/* PO Summary Metrics if model exists */}
            {kineticModel && (
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">
                    PO Curve R²
                  </div>
                  <div className="text-base sm:text-lg font-bold num text-emerald-700 dark:text-emerald-400">
                    {kineticModel.r2.toFixed(4)}
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">
                    PO Slope (Sensitivity)
                  </div>
                  <div className="text-base sm:text-lg font-bold num text-slate-900 dark:text-slate-100">
                    {kineticModel.slope.toFixed(4)}
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">
                    PO Intercept (Blank)
                  </div>
                  <div className="text-base sm:text-lg font-bold num text-slate-900 dark:text-slate-100">
                    {kineticModel.intercept.toFixed(4)}
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-[11px]">
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Fraction / Sample</th>
                    <th className="px-3 py-2">Rate (dA/min)</th>
                    <th className="px-3 py-2">Linearity (R²)</th>
                    <th className="px-3 py-2">PO Est. EU/mL</th>
                    <th className="px-3 py-2 text-right">Enzyme Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {validKinetic.map((k) => {
                    const isHigh = k.rate >= 0.01;
                    const isBase = k.rate < 0.001;
                    return (
                      <tr key={k.id} className="avoid-break">
                        <td className="px-3 py-2 uppercase text-[9px] font-bold text-slate-500 dark:text-slate-400">
                          {k.type}
                        </td>
                        <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-200">
                          {k.name}
                        </td>
                        <td className="px-3 py-2 font-mono font-bold text-indigo-700 dark:text-indigo-400">
                          {k.rate.toFixed(5)}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-300">
                          {Number.isFinite(k.r2) ? k.r2.toFixed(4) : (k.inputMode === 'direct_rate' ? 'Direct' : '—')}
                        </td>
                        <td className="px-3 py-2 font-mono font-bold text-slate-900 dark:text-slate-100">
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
                                ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                                : isBase
                                ? 'text-slate-500 dark:text-slate-400 font-normal'
                                : 'text-indigo-700 dark:text-indigo-400 font-medium'
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
              <figure className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
                <KineticChart results={validKinetic} height={200} isPrintView={true} />
                <figcaption className="text-center text-[10px] text-slate-400 mt-1 italic">
                  Figure 2A — Absorbance ({wavelengths.phenoloxidase} nm) vs. Reaction Time progress curves.
                </figcaption>
              </figure>

              {kineticModel ? (
                <figure className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
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
            <h2 className="text-xs uppercase tracking-wider text-indigo-900 dark:text-indigo-200 font-bold avoid-break-after flex items-center gap-1.5">
              <GitCompare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              {reportScope === 'all' ? '4. ' : ''}Exploratory Cross-Assay Method Comparison (Coagulation vs. Phenoloxidase)
            </h2>
            <DualAssayComparisonSection
              comparisons={comparisons}
              onDownloadCsv={onDownloadComparisonCsv || (() => {})}
              isPrintView={true}
            />
          </section>
        )}

        {/* SECTION 4: PLAIN-LANGUAGE EXPLAINER & SUPPORTING LITERATURE */}
        <section className="avoid-break space-y-4 pt-2">
          {/* N1: Plain-Language Result Explainer */}
          {explanationText ? (
            <div className="bg-slate-50/80 dark:bg-slate-800/60 border border-indigo-200 dark:border-indigo-800/70 rounded-xl p-4 sm:p-5 space-y-3 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 dark:border-indigo-900/60 pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                    {isFallbackExplanation ? (
                      <Cpu className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <FlaskConical className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                      <span>AI-Generated Plain-Language Summary of Your Results</span>
                      <span className="text-[10px] font-mono font-medium px-2 py-0.2 rounded-full border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-850 text-indigo-600 dark:text-indigo-300">
                        {isFallbackExplanation ? 'Local Rule Engine' : 'Gemini AI'}
                      </span>
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Grounded synthesis of calculated regression fits, enzyme rates, and sample threshold statuses
                    </p>
                  </div>
                </div>

                <div className="no-print flex items-center gap-2">
                  <button
                    onClick={handleExplainResult}
                    disabled={isLoadingExplanation}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 flex items-center gap-1 cursor-pointer transition px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-slate-750"
                    title="Refresh plain-language summary"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingExplanation ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Informational banner if fallback engine was engaged */}
              {isFallbackExplanation && (
                <div className="no-print flex items-center justify-between gap-3 p-2.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-[11px] text-amber-800 dark:text-amber-200">
                  <div className="flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>
                      Synthesized via local analytical engine (upstream AI model experienced temporary high demand).
                    </span>
                  </div>
                  <button
                    onClick={handleExplainResult}
                    disabled={isLoadingExplanation}
                    className="underline hover:no-underline font-semibold text-amber-900 dark:text-amber-100 shrink-0 cursor-pointer"
                  >
                    Retry with Gemini AI
                  </button>
                </div>
              )}

              {/* Underlying Deterministic Stats Grid */}
              <div className="bg-white dark:bg-slate-900/70 p-3 rounded-lg border border-slate-200 dark:border-slate-750 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                <div>
                  <span className="text-slate-400 text-[10px] block font-semibold uppercase">Coagulation Fit</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    R² = {calibration?.r2?.toFixed?.(4) ?? 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-semibold uppercase">PO Sensitivity</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {kineticModel?.slope ? `${kineticModel.slope.toFixed(4)} OD/min/EU` : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-semibold uppercase">Study Threshold</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {threshold.toFixed(2)} EU/mL
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-semibold uppercase">Sample Status</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {results.filter(r => r.eu !== null && r.eu < threshold).length} below / {results.filter(r => r.eu !== null && r.eu >= threshold).length} above
                  </span>
                </div>
              </div>

              {/* Formatted Markdown Body */}
              <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed prose prose-sm dark:prose-invert max-w-none space-y-2">
                <div className="markdown-body">
                  <Markdown>{explanationText}</Markdown>
                </div>
              </div>

              {/* Permanent small disclaimer */}
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 italic">
                <Info className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                <span>AI-generated plain-language summary of your results — based solely on calculated parameters. Research analysis only.</span>
              </div>
            </div>
          ) : isLoadingExplanation ? (
            <div className="p-6 bg-slate-50/70 dark:bg-slate-800/50 border border-indigo-200/60 dark:border-indigo-800/60 rounded-xl text-center space-y-2.5">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400 mx-auto" />
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Generating plain-language summary of results...
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Evaluating coagulation regression, PO kinetic velocities, and exploratory method comparison metrics.
              </p>
            </div>
          ) : explanationError ? (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl space-y-2.5">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>AI Service Currently Experiencing High Demand</span>
              </div>
              <p className="text-xs text-rose-600 dark:text-rose-300 leading-relaxed">
                {explanationError}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={handleExplainResult}
                  className="px-3 py-1.5 bg-rose-600 text-white rounded text-xs font-semibold hover:bg-rose-700 transition cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry AI Request</span>
                </button>
                <button
                  onClick={handleGenerateLocalFallback}
                  className="px-3 py-1.5 bg-white dark:bg-slate-850 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded text-xs font-semibold hover:bg-rose-100/50 dark:hover:bg-slate-800 transition cursor-pointer flex items-center gap-1"
                >
                  <Cpu className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                  <span>Generate Local Analytical Report</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="no-print p-4 bg-slate-50/60 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Generate Plain-Language Summary of Results
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Produces a structured plain-language summary of sample findings and method comparison metrics grounded in the numerical data.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                <button
                  onClick={handleExplainResult}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Explain Result</span>
                </button>
              </div>
            </div>
          )}

          {/* N2: Supporting-Literature Lookup Panel */}
          {literatureData ? (
            <div className="bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/70 rounded-xl p-4 sm:p-5 space-y-4 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-200/70 dark:border-teal-900/60 pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-teal-950 dark:text-teal-200 flex items-center gap-2">
                      <span>External Literature (via Semantic Scholar) — Not Generated by This Tool's Analysis</span>
                    </h3>
                    <p className="text-[10px] text-teal-700 dark:text-teal-400">
                      Peer-reviewed literature retrieved to contextualize Archachatina marginata hemolymph bioassay mechanisms
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleLookupLiterature}
                  disabled={isLoadingLiterature}
                  className="no-print text-[11px] font-semibold text-teal-700 dark:text-teal-300 hover:text-teal-900 dark:hover:text-teal-100 flex items-center gap-1 cursor-pointer transition px-2 py-1 rounded hover:bg-teal-100/60 dark:hover:bg-teal-900/40"
                  title="Refresh literature search"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingLiterature ? 'animate-spin' : ''}`} />
                  <span>Re-search</span>
                </button>
              </div>

              {literatureData.isRateLimited && (
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200 flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    Semantic Scholar public API query limit reached; literature synthesis generated using verified reference index.
                  </span>
                </div>
              )}

              {/* Synthesized Literature Discussion */}
              <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed prose prose-sm dark:prose-invert max-w-none space-y-2 bg-white/70 dark:bg-slate-900/60 p-3.5 rounded-lg border border-teal-100 dark:border-teal-900/50">
                <div className="markdown-body">
                  <Markdown>{literatureData.synthesis}</Markdown>
                </div>
              </div>

              {/* Retrieved Papers List */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Referenced Publications ({literatureData.papers.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {literatureData.papers.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs space-y-1 hover:border-teal-300 dark:hover:border-teal-700 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                          {p.title}
                        </div>
                        {p.url && (
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-200 shrink-0 mt-0.5"
                            title="Open paper in Semantic Scholar"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <span>{p.authors?.slice(0, 2).join(', ')}{p.authors && p.authors.length > 2 ? ' et al.' : ''}</span>
                        {p.year && <span>&bull; {p.year}</span>}
                        {p.citationCount !== undefined && <span>&bull; {p.citationCount} citations</span>}
                      </div>
                      {p.abstract && (
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mt-1">
                          {p.abstract}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-teal-200/60 dark:border-teal-900/60 text-[10px] text-slate-500 dark:text-slate-400 italic">
                Source: {literatureData.retrievalSource} &bull; Retrieved for educational context &bull; Does not constitute regulatory validation
              </div>
            </div>
          ) : isLoadingLiterature ? (
            <div className="p-6 bg-slate-50/70 dark:bg-slate-800/50 border border-teal-200/60 dark:border-teal-800/60 rounded-xl text-center space-y-2.5">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600 dark:text-teal-400 mx-auto" />
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Searching Semantic Scholar &amp; synthesizing supporting literature...
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Querying published papers on gastropod hemolymph, prophenoloxidase cascade, and endotoxin detection.
              </p>
            </div>
          ) : literatureError ? (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Literature Lookup Notice</span>
              </div>
              <p className="text-xs text-rose-600 dark:text-rose-300 leading-relaxed">
                {literatureError}
              </p>
              <button
                onClick={handleLookupLiterature}
                className="px-3 py-1.5 bg-rose-600 text-white rounded text-xs font-semibold hover:bg-rose-700 transition cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry Literature Search</span>
              </button>
            </div>
          ) : null}
        </section>

        {/* Section 5: Reviewer & Analyst Attribution (Metadata Only — Non-authenticated) */}
        <section className="pt-6 border-t-2 border-slate-200 dark:border-slate-700 space-y-3 avoid-break">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Reviewer &amp; Analyst Attribution (Metadata Only — Non-authenticated)
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Note: Signer fields represent study workflow metadata only and do not constitute authenticated digital signatures or regulatory release certifications.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:gap-16 pt-3">
            <div>
              <div className="min-h-9 border-b border-slate-400 dark:border-slate-500 flex items-end pb-1">
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                  {analystName.trim() || '______________________________'}
                </span>
              </div>
              <div className="mt-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                Student / Analyst Attribution
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 flex items-center gap-1.5">
                <span>{analystName.trim() ? analystName.trim() : 'Name not entered'}</span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span>{analystDate || currentDate}</span>
              </div>
            </div>
            <div>
              <div className="min-h-9 border-b border-slate-400 dark:border-slate-500 flex items-end pb-1">
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                  {supervisorName.trim() || '______________________________'}
                </span>
              </div>
              <div className="mt-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                Supervisor Review Attribution
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 flex items-center gap-1.5">
                <span>{supervisorName.trim() ? supervisorName.trim() : 'Name not entered'}</span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span>{supervisorDate || currentDate}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-4 text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-semibold border-t border-slate-100 dark:border-slate-800 text-center avoid-break">
          Archachatina marginata Endotoxin Research Suite · Proof-of-concept research &amp; educational tool
        </footer>
      </article>
    </div>
  );
};

