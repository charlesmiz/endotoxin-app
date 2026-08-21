import React, { useState } from 'react';
import {
  BookOpen,
  X,
  FlaskConical,
  Activity,
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  HelpCircle,
  Award,
  Layers,
  Sparkles,
} from 'lucide-react';

interface LabManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LabManualModal: React.FC<LabManualModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeSection, setActiveSection] = useState<
    'overview' | 'sop' | 'po_modes' | 'anova' | 'statuses' | 'faq'
  >('overview');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Endotoxin Kit Lab Manual &amp; Protocol Guide
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Standard Operating Procedure (SOP) &bull; <em>Archachatina marginata</em> Hemolymph Assays
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Sub-bar */}
        <div className="px-6 border-b border-slate-200 bg-white flex items-center gap-2 overflow-x-auto text-xs font-medium shrink-0 py-2">
          <button
            onClick={() => setActiveSection('overview')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeSection === 'overview'
                ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            1. Assay Principles
          </button>
          <button
            onClick={() => setActiveSection('sop')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeSection === 'sop'
                ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            2. Step-by-Step SOP
          </button>
          <button
            onClick={() => setActiveSection('po_modes')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeSection === 'po_modes'
                ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            3. PO Kinetic Modes
          </button>
          <button
            onClick={() => setActiveSection('anova')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeSection === 'anova'
                ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            4. Statistics &amp; ANOVA
          </button>
          <button
            onClick={() => setActiveSection('statuses')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeSection === 'statuses'
                ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            5. Statuses &amp; Remarks
          </button>
          <button
            onClick={() => setActiveSection('faq')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeSection === 'faq'
                ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            6. Troubleshooting &amp; FAQ
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-700 text-xs leading-relaxed space-y-6">
          {activeSection === 'overview' && (
            <div className="space-y-4">
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4">
                <h3 className="text-sm font-bold text-indigo-950 mb-1">
                  Biological Background: Archachatina marginata Hemolymph System
                </h3>
                <p className="text-slate-700">
                  The African giant snail (<em>Archachatina marginata</em>) possesses an innate immune surveillance system mediated by circulating hemolymph proteins. When exposed to Gram-negative bacterial lipopolysaccharide (LPS / Endotoxin), two distinct biochemical response cascades are activated:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2">
                  <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wide">
                    <FlaskConical className="w-4 h-4" />
                    1. Coagulin Clotting Pathway (Turbidimetric)
                  </div>
                  <p className="text-slate-600">
                    Endotoxin triggers the cleavage of soluble hemolymph coagulogen into insoluble coagulin gel filaments. The resulting optical turbidity is measured spectrophotometrically at <strong>545 nm</strong> (or 405/600 nm). Higher endotoxin generates proportional protein gel cloudiness.
                  </p>
                  <div className="text-[11px] bg-slate-50 p-2 rounded border border-slate-200 font-mono text-slate-700">
                    Standard wavelength: &lambda; = 545 nm (Endpoint Optical Density)
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2">
                  <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wide">
                    <Activity className="w-4 h-4" />
                    2. Prophenoloxidase (proPO) Activation (Kinetic)
                  </div>
                  <p className="text-slate-600">
                    Endotoxin activates the serine protease cascade converting zymogen prophenoloxidase into active phenoloxidase (PO). Active PO oxidizes L-DOPA/dopamine substrate into dopachrome (monitored at <strong>490 nm</strong>). Reaction velocity (<em>dA/dt</em>, OD/min) correlates with endotoxin quantity.
                  </p>
                  <div className="text-[11px] bg-slate-50 p-2 rounded border border-slate-200 font-mono text-slate-700">
                    Standard wavelength: &lambda; = 490 nm (Kinetic Slope &Delta;A/&Delta;t)
                  </div>
                </div>
              </div>

              <div className="border border-emerald-200 bg-emerald-50/60 rounded-xl p-4 text-emerald-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <GitCompare className="w-4 h-4 text-emerald-700" />
                  Why Dual-Method Orthogonal Validation?
                </div>
                <p className="text-emerald-900">
                  Measuring an unknown commercial intravenous fluid through both independent biochemical mechanisms eliminates false positives caused by non-pyrogenic optical precipitates, matrix turbidity, or non-specific enzyme inhibitors. When both assays agree within <strong>&le; 20% Relative Percent Difference (RPD)</strong>, the quantification is scientifically robust.
                </p>
              </div>
            </div>
          )}

          {activeSection === 'sop' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">
                Standard Operating Procedure (SOP) Workflow
              </h3>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3.5 bg-white border border-slate-200 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">Establish Coagulation Standard Curve</h4>
                    <p className="text-slate-600 mt-0.5">
                      Prepare serial standard dilutions (e.g. 0.0, 0.5, 2.0, 5.0 EU/mL). Enter mean absorbance values at 545 nm (or enter comma-separated replicates for automated SD and CV% calculation). Click <strong>Compute Curve</strong>. Ensure $R^2 \ge 0.900$.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-white border border-slate-200 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">Quantify Unknown Samples (Coagulation)</h4>
                    <p className="text-slate-600 mt-0.5">
                      Switch to <strong>2. Coagulation Estimator</strong>. Enter commercial infusion samples and their absorbance. The tool solves the linear (x = (y-c)/m) or quadratic regression equation, evaluating compliance against the USP/EP 0.500 EU/mL threshold.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-white border border-slate-200 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">Perform Phenoloxidase Kinetic Assay</h4>
                    <p className="text-slate-600 mt-0.5">
                      Switch to <strong>3. PO Kinetics &amp; EU/mL</strong>. Choose your data input mode: either enter pre-calculated velocities from microplate software, or enter raw time-series absorbance readings (e.g., 0, 2, 4, 6, 8, 10 min). Click <strong>Calculate Rates &amp; Estimate EU/mL</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-white border border-slate-200 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    4
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">Cross-Assay Concordance Comparison</h4>
                    <p className="text-slate-600 mt-0.5">
                      Switch to <strong>4. Cross-Assay Concordance</strong>. The system automatically cross-references sample names between Coagulation and Phenoloxidase, computing the Relative Percent Difference (RPD %) and Concordance status.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-white border border-slate-200 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    5
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">Generate Validation Report &amp; Dossier</h4>
                    <p className="text-slate-600 mt-0.5">
                      Open <strong>5. Validation Report</strong>. Choose to generate an integrated dual-method report, or isolate either Coagulation or Phenoloxidase individually. Print official laboratory dossiers or export raw CSV data.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'po_modes' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">
                Phenoloxidase Dual Input Modes Guide
              </h3>
              <p className="text-slate-600">
                Depending on your laboratory instrument software (e.g., SpectraMax, Gen5, or manual benchtop spectrophotometer), you can enter phenoloxidase kinetic data in either of two modes:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-indigo-200 rounded-xl p-4 bg-indigo-50/40 space-y-2">
                  <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded uppercase">
                    Mode A: Pre-calculated Direct Rates
                  </span>
                  <h4 className="font-bold text-slate-900 text-xs">Single Velocity (&Delta;A / min)</h4>
                  <p className="text-slate-600">
                    Use this mode if your microplate reader or Excel template has already performed kinetic linear regression and outputs a single velocity (dA/dt in OD/min) for each well.
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
                    <li>Fastest data entry for large batch assays.</li>
                    <li>Enter Standard EU levels and unknown sample rates directly.</li>
                    <li>Builds the PO kinetic standard curve (v = m &bull; [EU] + c).</li>
                  </ul>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2 shadow-xs">
                  <span className="px-2 py-0.5 bg-slate-700 text-white text-[10px] font-bold rounded uppercase">
                    Mode B: Raw Time-Series Absorbance Matrix
                  </span>
                  <h4 className="font-bold text-slate-900 text-xs">Multi-Point Progress Curves</h4>
                  <p className="text-slate-600">
                    Use this mode for manual benchtop spectrophotometer time-course measurements taken at intervals (e.g., t = 0, 2, 4, 6, 8, 10 min).
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
                    <li>Computes individual kinetic slopes (dA/dt) via Ordinary Least Squares.</li>
                    <li>Generates R&sup2; linearity for each reaction time-course.</li>
                    <li>Renders interactive reaction progress curves in Plotly.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'anova' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">
                Statistical Foundation: Regression vs. ANOVA
              </h3>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <h4 className="font-bold text-slate-900 text-xs">
                  Are our coagulation curves calculated using ANOVA? What difference does it make?
                </h4>
                <p className="text-slate-600">
                  Standard curves are fitted using <strong>Ordinary Least Squares (OLS) Regression</strong> to establish the mathematical calibration function (y = mx + c). However, <strong>ANOVA (Analysis of Variance for Regression)</strong> is used to statistically test whether that regression relationship is genuine or merely random noise.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-1">
                  <div className="font-bold text-slate-900 text-xs">1. Regression Sum of Squares (SS_Reg)</div>
                  <p className="text-slate-600 text-[11px]">
                    Measures the variance in absorbance directly accounted for by changes in endotoxin concentration.
                  </p>
                </div>
                <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-1">
                  <div className="font-bold text-slate-900 text-xs">2. Residual Error (SS_Res)</div>
                  <p className="text-slate-600 text-[11px]">
                    Measures unexplained background experimental noise and instrument measurement error.
                  </p>
                </div>
                <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-1">
                  <div className="font-bold text-slate-900 text-xs">3. F-Statistic &amp; p-Value</div>
                  <p className="text-slate-600 text-[11px]">
                    The ratio F = MS_Reg / MS_Res. A significant p &lt; 0.001 statistically proves concentration-dependent response.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 text-xs">
                <strong>In this tool:</strong> The Fit Quality card and Validation Report now display the complete <strong>Regression ANOVA Table</strong> (SS_Reg, SS_Res, F-ratio, and p-value) alongside the R&sup2; coefficient of determination for full academic and regulatory compliance!
              </div>
            </div>
          )}

          {activeSection === 'statuses' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">
                Interpretation Guide: Status Messages &amp; Remarks
              </h3>

              <div className="space-y-3">
                <div className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-2">
                  <h4 className="font-bold text-indigo-900 text-xs uppercase tracking-wide">
                    Coagulation Estimator Statuses
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px]">
                      <span className="font-bold text-emerald-800">PASS (≤ 0.500 EU/mL):</span>
                      <p className="text-emerald-700 mt-0.5">
                        Sample complies with pharmacopeial intravenous fluid safety specifications. Safe pyrogen limit.
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-[11px]">
                      <span className="font-bold text-rose-800">FLAGGED (&gt; 0.500 EU/mL):</span>
                      <p className="text-rose-700 mt-0.5">
                        Sample exceeds pyrogen safety threshold. Potential risk of febrile endotoxemia; re-test or reject batch.
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px]">
                      <span className="font-bold text-amber-800">Extrapolated:</span>
                      <p className="text-amber-700 mt-0.5">
                        Absorbance is outside the standard curve calibration range. Dilution is recommended.
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px]">
                      <span className="font-bold text-slate-800">Clamped Negative:</span>
                      <p className="text-slate-600 mt-0.5">
                        Absorbance reading was below the assay blank; estimated EU is mathematically reported as 0.000 EU/mL.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-2">
                  <h4 className="font-bold text-indigo-900 text-xs uppercase tracking-wide">
                    Phenoloxidase Kinetic Activity Statuses
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-[11px]">
                      <span className="font-bold text-slate-800">Baseline (&lt; 0.001 OD/min):</span>
                      <p className="text-slate-600 mt-0.5">
                        Minimal substrate turnover. Characterizes sterile pyrogen-free negative control samples.
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-200 text-[11px]">
                      <span className="font-bold text-indigo-800">Active PO (0.001 - 0.010 OD/min):</span>
                      <p className="text-indigo-700 mt-0.5">
                        Moderate dopachrome formation corresponding to low-to-medium endotoxin stimulus.
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px]">
                      <span className="font-bold text-emerald-800">High Velocity (≥ 0.010 OD/min):</span>
                      <p className="text-emerald-700 mt-0.5">
                        Rapid enzymatic conversion via potent prophenoloxidase activation.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-2">
                  <h4 className="font-bold text-emerald-900 text-xs uppercase tracking-wide">
                    Cross-Assay Concordance (RPD %)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px]">
                      <span className="font-bold text-emerald-800">High Concordance (RPD ≤ 15%):</span>
                      <p className="text-emerald-700 mt-0.5">
                        Both clotting and enzyme velocity pathways independently confirm identical endotoxin quantification.
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-[11px]">
                      <span className="font-bold text-blue-800">Moderate (15% &lt; RPD ≤ 30%):</span>
                      <p className="text-blue-700 mt-0.5">
                        Within standard biological assay variation for invertebrate hemolymph.
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-[11px]">
                      <span className="font-bold text-rose-800">Discordant (RPD &gt; 30%):</span>
                      <p className="text-rose-700 mt-0.5">
                        Investigate matrix interference, optical turbidity artifacts, or potential enzyme inhibitors.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'faq' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                Frequently Asked Questions &amp; Troubleshooting
              </h3>

              <div className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-1">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                  Why are different wavelengths used for Coagulation and Phenoloxidase?
                </div>
                <p className="text-slate-600 text-[11px]">
                  <strong>Coagulation (545 nm)</strong> measures physical light scattering (turbidity) of coagulin gel aggregates without interfering with protein pigment absorption. <strong>Phenoloxidase (490 nm)</strong> measures the specific absorption maximum of dopachrome pigment formed during L-DOPA oxidation.
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-1">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                  What should I do if my calibration curve has $R^2 &lt; 0.90$?
                </div>
                <p className="text-slate-600 text-[11px]">
                  Check for pipetting air bubbles, verify the blank baseline reading, or re-run duplicate replicates. Standard curve linearity $R^2 \ge 0.90$ is recommended before estimating unknown clinical samples.
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-1">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                  How do I print or export a report for only one assay?
                </div>
                <p className="text-slate-600 text-[11px]">
                  In the <strong>Validation Report</strong> tab, use the <strong>Report Filter</strong> buttons to display "All Dual Assays", "Coagulation Only", or "Phenoloxidase Only". Clicking "Print / Save PDF" will generate a formatted laboratory dossier containing your selected view.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-medium">
            Supervised by Prof. M.O. Salawu &bull; Research Validation Suite
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition shadow-xs cursor-pointer"
          >
            Got It, Return to Lab
          </button>
        </div>
      </div>
    </div>
  );
};
