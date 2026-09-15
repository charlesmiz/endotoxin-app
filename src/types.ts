export interface ReplicateSummary {
  values: number[];
  invalidTokens: string[];
  mean: number;
  sd: number; // NaN if n < 2
  cv: number; // NaN if n < 2
  n: number;
}

export interface CalibrationRow {
  id: string;
  eu: string;
  abs: string;
  replicates: string;
  meanReadOnly?: boolean;
}

export interface SampleRow {
  id: string;
  sampleId: string; // Stable biological sample identifier, e.g. "S1", "INF-A", "CTR-WTR"
  name: string;
  abs: string;
  replicates: string;
  dilutionFactor?: string; // e.g. "1", "10", "50"
  meanReadOnly?: boolean;
}

export interface CalibrationPointMeta {
  eu: number;
  mean: number;
  sd: number;
  cv: number;
  n: number;
  replicates: number[];
}

export interface LinRegResult {
  slope: number;
  intercept: number;
  r2: number;
  stderr?: number;
  ssTot?: number;
  ssReg?: number;
  ssRes?: number;
  fStat?: number;
  pValue?: number;
  dfReg?: number;
  dfRes?: number;
}

export interface QuadRegResult {
  a: number;
  b: number;
  c: number;
  r2: number;
  stderr?: number;
  ssTot?: number;
  ssRes?: number;
  ssReg?: number;
  dfRes?: number;
}

export interface AnovaTable {
  ssReg: number;
  dfReg: number;
  msReg: number;
  ssRes: number;
  dfRes: number;
  msRes: number;
  ssTot: number;
  dfTot: number;
  fStat: number;
  pValue: number;
  status?: 'VALID' | 'INSUFFICIENT_DF' | 'UNDEFINED';
}

export interface ModelDiagnosticComparison {
  linearR2: number;
  quadR2: number;
  deltaR2: number;
  fStatImprovement?: number;
  pValueImprovement?: number;
  isCurvatureStatisticallySignificant: boolean;
  isMonotonicInRange: boolean;
  recommendation: 'linear' | 'quadratic';
  rationalExplanation: string;
}

export interface CalibrationModelFit {
  type: 'linear' | 'quadratic';
  model: 'linear' | 'quadratic';
  requestedModel: string;
  slope?: number;
  intercept?: number;
  a?: number;
  b?: number;
  c?: number;
  r2: number;
  points: [number, number][];
  meta: CalibrationPointMeta[];
  xMin: number;
  xMax: number;
  linear?: LinRegResult;
  quad?: QuadRegResult;
  anova?: AnovaTable;
  diagnostics?: ModelDiagnosticComparison;
  exploratory?: boolean;
  isValidCalibration: boolean;
  validationErrors?: string[];
}

export type AnalyticalHierarchyStatus =
  | 'INVALID_INPUT'
  | 'INVALID_CALIBRATION'
  | 'NO_SOLUTION'
  | 'AMBIGUOUS'
  | 'BELOW_BLANK'
  | 'OUT_OF_RANGE'
  | 'WITHIN_RANGE';

export type ComplianceStatus = 'PASS' | 'FLAGGED' | 'INCONCLUSIVE';

export interface StudyThresholdConfig {
  value: number;
  basis: string;
}

export interface SampleEstimateResult {
  id: string;
  sampleId: string;
  runId: string;
  name: string;
  abs: number;
  sd: number; // NaN when n < 2
  cv: number; // NaN when n < 2
  n: number;
  replicates: number[];
  invalidTokens: string[];
  rawEu: number; // Raw mathematical inversion of calibration curve (can be negative or extrapolated)
  eu: number; // Alias of rawEu for backward compatibility
  reportedEu: number | null; // Finite reportable value if within range, null otherwise
  dilutionFactor: number;
  originalConcentration: number | null; // reportedEu * dilutionFactor
  reportableText: string;
  analyticalStatus: AnalyticalHierarchyStatus;
  compliance: ComplianceStatus;
  status: 'PASS' | 'FLAGGED'; // Backward compatibility flag
  remark: string;
  outOfRange: boolean;
  invalidInput: boolean;
  negativeEstimate: boolean;
  ambiguous: boolean;
  noSolution: boolean;
}

// Phenoloxidase input mode: 'series' (time points) or 'direct_rate' (pre-calculated dA/min)
export type PoInputMode = 'series' | 'direct_rate';

export interface KineticSampleRow {
  id: string;
  sampleId: string; // Stable biological sample identifier
  name: string;
  type: 'standard' | 'sample';
  inputMode?: PoInputMode; // default 'series', or 'direct_rate'
  standardEu?: string;
  directRate?: string; // used when inputMode === 'direct_rate'
  readings: Record<number, string>;
  linearRegionStart?: number; // Start minute for linear dA/dt fit
  linearRegionEnd?: number; // End minute for linear dA/dt fit
}

export interface KineticCalibrationModel {
  slope: number;
  intercept: number;
  r2: number;
  stderr?: number;
  points: [number, number][]; // [standard EU/mL, kinetic rate dA/min]
  xMin: number;
  xMax: number;
  isValid: boolean;
  validationError?: string;
}

export interface KineticResult {
  id: string;
  sampleId: string;
  runId: string;
  name: string;
  type: 'standard' | 'sample';
  inputMode: PoInputMode;
  standardEu?: number;
  timePoints: number[];
  selectedTimeRange?: [number, number]; // [start, end] minutes used for rate calculation
  absReadings: number[];
  rate: number; // dA/dt in OD/min
  rateSource: 'direct_input' | 'time_series_fit';
  r2: number; // NaN if direct_rate, linear R² if time series
  deltaAbs: number; // NaN if direct_rate
  initialAbs: number; // NaN if direct_rate
  finalAbs: number; // NaN if direct_rate
  stderr?: number;
  estimatedEu?: number; // raw mathematical estimate from PO curve
  reportedEu?: number | null; // reportable quantitative concentration
  reportableText?: string;
  analyticalStatus?: AnalyticalHierarchyStatus;
  compliance?: ComplianceStatus;
  status?: 'PASS' | 'FLAGGED';
  activityLevel: 'baseline' | 'active' | 'high';
  activityThresholdType: 'exploratory_reference';
  remark: string;
  outOfRange?: boolean;
  negativeEstimate?: boolean;
  valid: boolean;
}

export interface AssayComparisonItem {
  id: string;
  sampleId: string;
  runId: string;
  name: string;
  coagEu: number | null;
  coagRawEu: number;
  coagAbs: number;
  coagStatus: string;
  coagAnalyticalStatus: AnalyticalHierarchyStatus;
  poEu: number | null;
  poRawEu: number;
  poRate: number;
  poStatus: string;
  poAnalyticalStatus?: AnalyticalHierarchyStatus;
  isEligibleForQuantitativeStats: boolean;
  exclusionReason?: string;
  absDiff: number | null;
  rpd: number | null; // Relative Percent Difference (%)
  ratio: number | null; // coag / po
  isLowConcentration: boolean;
  lowConcentrationWarning?: string;
  agreement: 'AGREE' | 'DISAGREE' | 'EXCLUDED';
  concordance: 'high' | 'moderate' | 'discordant' | 'non_quantifiable';
  comment: string;
}

export interface WavelengthSettings {
  coagulation: number; // nm, e.g. 545
  phenoloxidase: number; // nm, e.g. 490
}

export interface BlandAltmanPoint {
  sampleId: string;
  name: string;
  mean: number;
  diff: number; // coag - po
  absDiff: number;
  rpd: number;
  isLowConcentration: boolean;
  isOutlier: boolean;
}

export interface BlandAltmanResult {
  n: number;
  meanBias: number;
  sdBias: number;
  seBias: number;
  biasCiLower: number;
  biasCiUpper: number;
  upperLoa: number;
  lowerLoa: number;
  seLoa: number;
  upperLoaCiLower: number;
  upperLoaCiUpper: number;
  lowerLoaCiLower: number;
  lowerLoaCiUpper: number;
  points: BlandAltmanPoint[];
  withinLoaCount: number;
  percentWithinLoa: number; // Descriptive only
  trendSlope: number;
  trendIntercept: number;
  trendR: number;
  trendPValue: number;
  hasProportionalBiasWarning: boolean;
  heteroscedasticityR: number;
  heteroscedasticityPValue: number;
  hasHeteroscedasticityWarning: boolean;
  smallSampleWarning: boolean;
  allowableDifferenceMargin?: number; // User-configured a priori limit (EU/mL)
  agreementAcceptable?: boolean | null; // null if no allowable limit configured
  assumptionsNotice: string;
}

export interface PassingBablokResult {
  n: number;
  totalPairs: number;
  validPairs: number;
  tiedXPairs: number;
  tiedYPairs: number;
  sMinusOnePairs: number;
  kCount: number; // pairwise slopes < -1
  slope: number;
  intercept: number;
  slopeCiLower: number;
  slopeCiUpper: number;
  interceptCiLower: number;
  interceptCiUpper: number;
  hasConstantBias: boolean; // 0 not in CI of intercept
  hasProportionalBias: boolean; // 1 not in CI of slope
  cusumStat: number;
  cusumCritical: number;
  isLinear: boolean; // cusumStat <= cusumCritical
  pearsonR: number;
  r2: number;
  equation: string;
  interpretationNote: string;
}

export interface DemingResult {
  n: number;
  lambda: number;
  slope: number;
  intercept: number;
  slopeSe: number;
  interceptSe: number;
  slopeCiLower: number;
  slopeCiUpper: number;
  interceptCiLower: number;
  interceptCiUpper: number;
  hasConstantBias: boolean;
  hasProportionalBias: boolean;
  equation: string;
  r2: number;
  assumptionStatement: string;
}

export interface AgreementAnalysisSummary {
  blandAltman: BlandAltmanResult;
  passingBablok?: PassingBablokResult;
  deming?: DemingResult;
  allowableMargin?: number;
  exploratoryRpdTier1: number;
  exploratoryRpdTier2: number;
  lowConcentrationCutoff: number;
  concordanceStatement: string;
}


