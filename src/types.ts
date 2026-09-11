export interface ReplicateSummary {
  values: number[];
  mean: number;
  sd: number;
  cv: number;
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
  name: string;
  abs: string;
  replicates: string;
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
  exploratory?: boolean;
}

export interface SampleEstimateResult {
  name: string;
  abs: number;
  sd: number;
  cv: number;
  n: number;
  replicates: number[];
  eu: number;
  reportedEu: number; // clamped >= 0
  status: 'PASS' | 'FLAGGED';
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
  name: string;
  type: 'standard' | 'sample';
  inputMode?: PoInputMode; // default 'series', or 'direct_rate'
  standardEu?: string;
  directRate?: string; // used when inputMode === 'direct_rate'
  // key is time point in minutes (e.g. 0, 2, 4...) -> value is absorbance reading string
  readings: Record<number, string>;
}

export interface KineticCalibrationModel {
  slope: number;
  intercept: number;
  r2: number;
  stderr?: number;
  points: [number, number][]; // [standard EU/mL, kinetic rate dA/min]
  xMin: number;
  xMax: number;
}

export interface KineticResult {
  id: string;
  name: string;
  type: 'standard' | 'sample';
  inputMode: PoInputMode;
  standardEu?: number;
  timePoints: number[];
  absReadings: number[];
  rate: number; // dA/dt in OD/min
  r2: number; // linearity of kinetic slope (1.0 if direct rate)
  deltaAbs: number; // final - initial
  initialAbs: number;
  finalAbs: number;
  estimatedEu?: number; // calculated from PO standard curve if available
  reportedEu?: number; // max(0.0, estimatedEu)
  status?: 'PASS' | 'FLAGGED';
  activityLevel: 'baseline' | 'active' | 'high';
  remark: string;
  outOfRange?: boolean;
  negativeEstimate?: boolean;
  stderr?: number;
  valid: boolean;
}

export interface AssayComparisonItem {
  id: string;
  name: string;
  coagEu: number;
  coagAbs: number;
  coagStatus: string;
  poEu: number;
  poRate: number;
  poStatus: string;
  absDiff: number;
  rpd: number; // Relative Percent Difference (%)
  ratio: number; // coag / po
  agreement: 'AGREE' | 'DISAGREE';
  concordance: 'high' | 'moderate' | 'discordant';
  comment: string;
}

export interface WavelengthSettings {
  coagulation: number; // nm, e.g. 545
  phenoloxidase: number; // nm, e.g. 490
}

export interface BlandAltmanPoint {
  name: string;
  mean: number;
  diff: number;
  rpd: number;
  isOutlier: boolean;
}

export interface BlandAltmanResult {
  n: number;
  meanBias: number;
  sdBias: number;
  upperLoa: number;
  lowerLoa: number;
  seBias: number;
  seLoa: number;
  points: BlandAltmanPoint[];
  withinLoaCount: number;
  percentWithinLoa: number;
}

export interface PassingBablokResult {
  slope: number;
  intercept: number;
  slopeCiLower: number;
  slopeCiUpper: number;
  interceptCiLower: number;
  interceptCiUpper: number;
  hasConstantBias: boolean; // 0 not in CI of intercept
  hasProportionalBias: boolean; // 1 not in CI of slope
  pearsonR: number;
  r2: number;
  equation: string;
}

export interface DemingResult {
  slope: number;
  intercept: number;
  equation: string;
  r2: number;
}

export interface AgreementAnalysisSummary {
  blandAltman: BlandAltmanResult;
  passingBablok?: PassingBablokResult;
  deming?: DemingResult;
  concordanceStatement: string;
}


