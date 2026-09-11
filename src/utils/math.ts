import {
  ReplicateSummary,
  LinRegResult,
  QuadRegResult,
  AnovaTable,
  CalibrationModelFit,
  SampleEstimateResult,
  KineticSampleRow,
  KineticResult,
  KineticCalibrationModel,
  AssayComparisonItem,
  BlandAltmanResult,
  BlandAltmanPoint,
  PassingBablokResult,
  DemingResult,
  AgreementAnalysisSummary,
} from '../types';

export function mean(values: number[]): number {
  if (!values.length) return NaN;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function sd(values: number[]): number {
  if (values.length < 2) return NaN;
  const m = mean(values);
  return Math.sqrt(
    values.reduce((a, v) => a + (v - m) ** 2, 0) / (values.length - 1)
  );
}

export function parseReplicates(raw: string): number[] {
  if (!raw) return [];
  return raw
    .split(/[,;\s]+/)
    .map((v) => parseFloat(v))
    .filter((v) => Number.isFinite(v));
}

export function summarizeReplicates(
  meanValue: number,
  raw: string
): ReplicateSummary {
  const reps = parseReplicates(raw);
  const values = reps.length
    ? reps
    : Number.isFinite(meanValue)
    ? [meanValue]
    : [];
  const m = values.length ? mean(values) : NaN;
  const s = sd(values);
  const cv = Number.isFinite(s) && m !== 0 ? Math.abs((s / m) * 100) : NaN;
  return { values, mean: m, sd: s, cv, n: values.length };
}

// Approximate p-value for F-distribution with df1=1, df2=k
export function fDistributionPValue(f: number, df1: number, df2: number): number {
  if (!Number.isFinite(f) || f <= 0 || df1 <= 0 || df2 <= 0) return 1.0;
  // For df1 = 1, F = t^2. We can use Student's t approximation:
  const x = df2 / (df2 + df1 * f);
  // Incomplete beta function approximation for I_x(df2/2, df1/2)
  const a = df2 / 2;
  const b = df1 / 2;
  return Math.max(0.0, Math.min(1.0, betaIncomplete(a, b, x)));
}

// Log Gamma function (Lanczos approximation)
function logGamma(z: number): number {
  const c = [
    57.1562356658629235, -59.5979603554754912, 14.1360979747417471,
    -0.49190581665805373, 0.339946499848118887e-4, 0.465236289270485756e-4,
    -0.983744753048795646e-4, 0.158088703224912494e-3, -0.210264441724104883e-3,
    0.217439618115212643e-3, -0.16431810653676389e-3, 0.844182239838527433e-4,
    -0.261908384015814087e-4, 0.368991826595316234e-5,
  ];
  let sum = 0.99999999999999709182;
  for (let i = 0; i < c.length; i++) {
    sum += c[i] / (z + i + 1);
  }
  const t = z + c.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(sum);
}

// Continued fraction approximation for regularized incomplete beta
function betaIncomplete(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) {
    return bt * betaFraction(a, b, x) / a;
  } else {
    return 1 - bt * betaFraction(b, a, 1 - x) / b;
  }
}

function betaFraction(a: number, b: number, x: number): number {
  const maxIt = 100;
  const eps = 1e-12;
  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < eps) d = eps;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= maxIt; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < eps) d = eps;
    c = 1 + aa / c;
    if (Math.abs(c) < eps) c = eps;
    d = 1 / d;
    h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < eps) d = eps;
    c = 1 + aa / c;
    if (Math.abs(c) < eps) c = eps;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < eps) break;
  }
  return h;
}

export function linreg(points: [number, number][]): LinRegResult {
  const n = points.length;
  if (n < 2) return { slope: NaN, intercept: NaN, r2: NaN };
  const sx = points.reduce((a, p) => a + p[0], 0);
  const sy = points.reduce((a, p) => a + p[1], 0);
  const sxy = points.reduce((a, p) => a + p[0] * p[1], 0);
  const sxx = points.reduce((a, p) => a + p[0] * p[0], 0);
  const den = n * sxx - sx * sx;
  if (Math.abs(den) < 1e-12) return { slope: NaN, intercept: NaN, r2: NaN };
  const slope = (n * sxy - sx * sy) / den;
  const intercept = (sy - slope * sx) / n;
  const meanY = sy / n;
  const ssTot = points.reduce((a, p) => a + (p[1] - meanY) ** 2, 0);
  const ssRes = points.reduce(
    (a, p) => a + (p[1] - (slope * p[0] + intercept)) ** 2,
    0
  );
  const ssReg = Math.max(0, ssTot - ssRes);
  const r2 = ssTot === 0 ? 0 : Math.max(0, Math.min(1, 1 - ssRes / ssTot));

  const dfReg = 1;
  const dfRes = Math.max(0, n - 2);
  let stderr = NaN;
  let fStat = NaN;
  let pValue = NaN;

  if (dfRes > 0 && den > 0) {
    const sxxSample = sxx - (sx * sx) / n;
    stderr = Math.sqrt((ssRes / dfRes) / sxxSample);
    const msReg = ssReg / dfReg;
    const msRes = ssRes / dfRes;
    fStat = msRes > 0 ? msReg / msRes : Infinity;
    pValue = fDistributionPValue(fStat, dfReg, dfRes);
  }

  return { slope, intercept, r2, stderr, ssTot, ssReg, ssRes, fStat, pValue, dfReg, dfRes };
}

export function computeAnovaTable(points: [number, number][], lin: LinRegResult): AnovaTable {
  const n = points.length;
  const ssTot = lin.ssTot ?? 0;
  const ssRes = lin.ssRes ?? 0;
  const ssReg = lin.ssReg ?? Math.max(0, ssTot - ssRes);
  const dfReg = 1;
  const dfRes = Math.max(1, n - 2);
  const dfTot = Math.max(1, n - 1);
  const msReg = ssReg / dfReg;
  const msRes = ssRes / dfRes;
  const fStat = msRes > 0 ? msReg / msRes : (lin.fStat ?? NaN);
  const pValue = Number.isFinite(lin.pValue) ? lin.pValue! : fDistributionPValue(fStat, dfReg, dfRes);

  return {
    ssReg,
    dfReg,
    msReg,
    ssRes,
    dfRes,
    msRes,
    ssTot,
    dfTot,
    fStat,
    pValue,
  };
}

export function quadreg(points: [number, number][]): QuadRegResult {
  if (points.length < 3) return { a: NaN, b: NaN, c: NaN, r2: NaN };
  let s0 = points.length,
    s1 = 0,
    s2 = 0,
    s3 = 0,
    s4 = 0,
    t0 = 0,
    t1 = 0,
    t2 = 0;
  for (const [x, y] of points) {
    const x2 = x * x;
    s1 += x;
    s2 += x2;
    s3 += x2 * x;
    s4 += x2 * x2;
    t0 += y;
    t1 += x * y;
    t2 += x2 * y;
  }
  const A = [
    [s4, s3, s2],
    [s3, s2, s1],
    [s2, s1, s0],
  ];
  const B = [t2, t1, t0];
  const M = A.map((r, i) => [...r, B[i]]);
  for (let col = 0; col < 3; col++) {
    let pivot = col;
    for (let r = col + 1; r < 3; r++)
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    if (Math.abs(M[pivot][col]) < 1e-12)
      return { a: NaN, b: NaN, c: NaN, r2: NaN };
    [M[col], M[pivot]] = [M[pivot], M[col]];
    const pv = M[col][col];
    for (let j = col; j < 4; j++) M[col][j] /= pv;
    for (let r = 0; r < 3; r++)
      if (r !== col) {
        const f = M[r][col];
        for (let j = col; j < 4; j++) M[r][j] -= f * M[col][j];
      }
  }
  const [a, b, c] = [M[0][3], M[1][3], M[2][3]];
  const meanY = points.reduce((q, p) => q + p[1], 0) / points.length;
  const ssTot = points.reduce((q, p) => q + (p[1] - meanY) ** 2, 0);
  const ssRes = points.reduce(
    (q, p) => q + (p[1] - (a * p[0] * p[0] + b * p[0] + c)) ** 2,
    0
  );
  const r2 = ssTot === 0 ? NaN : 1 - ssRes / ssTot;
  return { a, b, c, r2 };
}

export function chooseModel(
  points: [number, number][],
  requested: string
): {
  type: 'linear' | 'quadratic';
  slope?: number;
  intercept?: number;
  a?: number;
  b?: number;
  c?: number;
  r2: number;
  linear?: LinRegResult;
  quad?: QuadRegResult;
  anova?: AnovaTable;
  exploratory?: boolean;
} {
  const linear = linreg(points);
  const quad = quadreg(points);
  const anova = computeAnovaTable(points, linear);

  if (requested === 'linear') return { type: 'linear', ...linear, quad, anova };
  if (requested === 'quadratic') return { type: 'quadratic', ...quad, linear, anova };
  if (
    points.length >= 5 &&
    Number.isFinite(quad.r2) &&
    Number.isFinite(linear.r2) &&
    quad.r2 - linear.r2 >= 0.03
  ) {
    return { type: 'quadratic', ...quad, linear, anova, exploratory: true };
  }
  return { type: 'linear', ...linear, quad, anova };
}

export function invertQuadratic(
  model: { a: number; b: number; c: number },
  y: number,
  xMin: number,
  xMax: number
): { roots: number[]; ambiguous: boolean } {
  const A = model.a,
    B = model.b,
    C = model.c - y;
  if (Math.abs(A) < 1e-12)
    return { roots: [(y - model.c) / model.b], ambiguous: false };
  const disc = B * B - 4 * A * C;
  if (disc < 0) return { roots: [], ambiguous: false };
  const r = Math.sqrt(disc);
  const roots = [(-B + r) / (2 * A), (-B - r) / (2 * A)]
    .filter(Number.isFinite)
    .filter((x) => x >= xMin - 1e-10 && x <= xMax + 1e-10);
  const unique = [...new Set(roots.map((v) => Number(v.toPrecision(12))))];
  return { roots: unique, ambiguous: unique.length > 1 };
}

export function computeSampleEstimates(
  calibration: CalibrationModelFit,
  samples: {
    name: string;
    abs: number;
    sd: number;
    cv: number;
    n: number;
    replicates: number[];
  }[],
  thresholdEu: number = 0.500
): SampleEstimateResult[] {
  const absValues = calibration.points.map((p) => p[1]);
  const absMin = Math.min(...absValues);
  const absMax = Math.max(...absValues);

  return samples.map((s) => {
    let eu = NaN;
    let ambiguous = false;
    let noSolution = false;

    if (calibration.type === 'linear') {
      let slope = calibration.slope ?? NaN;
      if (slope <= 0) slope = 0.000001; // prevent crash if negative or zero
      const intercept = calibration.intercept ?? NaN;
      eu = (s.abs - intercept) / slope;
    } else {
      const inv = invertQuadratic(
        { a: calibration.a!, b: calibration.b!, c: calibration.c! },
        s.abs,
        calibration.xMin,
        calibration.xMax
      );
      ambiguous = inv.ambiguous;
      if (inv.roots.length === 1) eu = inv.roots[0];
      else if (inv.roots.length === 0) noSolution = true;
    }

    const outOfRange = s.abs < absMin || s.abs > absMax;
    const invalidInput = s.abs < 0;
    const negativeEstimate = Number.isFinite(eu) && eu < 0;
    const reportedEu = Number.isFinite(eu) ? Math.max(0.0, eu) : NaN;

    const status: 'PASS' | 'FLAGGED' =
      Number.isFinite(reportedEu) && reportedEu <= thresholdEu ? 'PASS' : 'FLAGGED';

    let remark = '';
    if (invalidInput) {
      remark = 'Invalid negative absorbance reading. Check spectrophotometer baseline/blank.';
    } else if (noSolution) {
      remark = 'Absorbance value does not intersect valid calibration polynomial solution range.';
    } else if (ambiguous) {
      remark = 'Ambiguous quadratic roots detected. Re-verify linear standard range.';
    } else if (outOfRange) {
      remark = `Extrapolated reading (${s.abs.toFixed(4)} OD outside standard curve range [${absMin.toFixed(3)} - ${absMax.toFixed(3)}]). Sample dilution recommended.`;
    } else if (status === 'PASS') {
      remark = `Meets standard IV fluid pyrogen limit (≤ ${thresholdEu.toFixed(3)} EU/mL). Safe endotoxin compliance.`;
    } else {
      remark = `Exceeds endotoxin release threshold (> ${thresholdEu.toFixed(3)} EU/mL). Potential risk of febrile endotoxemia.`;
    }

    return {
      ...s,
      eu,
      reportedEu,
      status,
      remark,
      outOfRange,
      invalidInput,
      negativeEstimate,
      ambiguous,
      noSolution,
    };
  });
}

// Compute Phenoloxidase kinetic rates & standard calibration curve
// Supports BOTH Mode 1 (Pre-calculated direct rates) AND Mode 2 (Raw time-series)
export function computeKineticRates(
  timePoints: number[],
  rows: KineticSampleRow[],
  thresholdEu: number = 0.500
): {
  results: KineticResult[];
  model: KineticCalibrationModel | null;
} {
  const computedResults: KineticResult[] = rows.map((row) => {
    const mode = row.inputMode || 'series';
    const isStandard = row.type === 'standard';
    const stdEuNum =
      isStandard && row.standardEu !== undefined && row.standardEu.trim() !== ''
        ? parseFloat(row.standardEu)
        : undefined;

    // MODE 1: Direct Pre-calculated Rate (e.g. from Excel / plate reader export)
    if (mode === 'direct_rate') {
      const rateVal = row.directRate !== undefined && row.directRate.trim() !== ''
        ? parseFloat(row.directRate)
        : NaN;

      const isValid = Number.isFinite(rateVal) && Boolean(row.name.trim());
      const activityLevel: 'baseline' | 'active' | 'high' =
        rateVal >= 0.010 ? 'high' : rateVal < 0.001 ? 'baseline' : 'active';

      let remark = '';
      if (!isValid) {
        remark = 'Missing or invalid pre-calculated rate (dA/min).';
      } else if (activityLevel === 'high') {
        remark = 'High enzymatic velocity (dA/dt ≥ 0.010 OD/min). Strong proPO cascade activation.';
      } else if (activityLevel === 'baseline') {
        remark = 'Baseline rate (< 0.001 OD/min). Negligible substrate turnover.';
      } else {
        remark = 'Active phenoloxidase catalysis (0.001 ≤ dA/dt < 0.010 OD/min).';
      }

      return {
        id: row.id,
        name: row.name.trim() || 'Unnamed Sample',
        type: row.type,
        inputMode: 'direct_rate',
        standardEu: stdEuNum,
        timePoints: [],
        absReadings: [],
        rate: rateVal,
        r2: 1.0, // perfect fit by definition for pre-calculated direct rate
        deltaAbs: rateVal,
        initialAbs: 0,
        finalAbs: rateVal,
        activityLevel,
        remark,
        valid: isValid,
      };
    }

    // MODE 2: Raw Absorbance Time-Series Matrix
    const validPairs: [number, number][] = [];
    const pairedTimes: number[] = [];
    const pairedAbs: number[] = [];

    timePoints.forEach((t) => {
      const valStr = row.readings[t];
      if (valStr !== undefined && valStr.trim() !== '') {
        const val = parseFloat(valStr);
        if (Number.isFinite(val)) {
          validPairs.push([t, val]);
          pairedTimes.push(t);
          pairedAbs.push(val);
        }
      }
    });

    if (validPairs.length < 2 || !row.name.trim()) {
      return {
        id: row.id,
        name: row.name || 'Unnamed Sample',
        type: row.type,
        inputMode: 'series',
        standardEu: stdEuNum,
        timePoints: pairedTimes,
        absReadings: pairedAbs,
        rate: NaN,
        r2: NaN,
        deltaAbs: NaN,
        initialAbs: pairedAbs.length > 0 ? pairedAbs[0] : NaN,
        finalAbs: pairedAbs.length > 0 ? pairedAbs[pairedAbs.length - 1] : NaN,
        activityLevel: 'baseline',
        remark: 'Insufficient time points (minimum 2 absorbance readings required to fit dA/dt slope).',
        valid: false,
      };
    }

    const reg = linreg(validPairs);
    const initialAbs = pairedAbs[0];
    const finalAbs = pairedAbs[pairedAbs.length - 1];
    const deltaAbs = finalAbs - initialAbs;
    const rateVal = reg.slope;

    const activityLevel: 'baseline' | 'active' | 'high' =
      rateVal >= 0.010 ? 'high' : rateVal < 0.001 ? 'baseline' : 'active';

    let remark = '';
    if (activityLevel === 'high') {
      remark = `High velocity (dA/dt = ${rateVal.toFixed(4)} OD/min, R²=${reg.r2.toFixed(3)}). Strong dopachrome formation.`;
    } else if (activityLevel === 'baseline') {
      remark = `Baseline activation (< 0.001 OD/min). Minimal background optical change.`;
    } else {
      remark = `Active enzyme turnover (dA/dt = ${rateVal.toFixed(4)} OD/min, R²=${reg.r2.toFixed(3)}).`;
    }

    return {
      id: row.id,
      name: row.name.trim(),
      type: row.type,
      inputMode: 'series',
      standardEu: stdEuNum,
      timePoints: pairedTimes,
      absReadings: pairedAbs,
      rate: rateVal, // dA/dt in OD/min
      r2: reg.r2,
      stderr: reg.stderr,
      deltaAbs,
      initialAbs,
      finalAbs,
      activityLevel,
      remark,
      valid: Number.isFinite(rateVal),
    };
  });

  // Fit Kinetic Standard Calibration Curve if >= 2 valid standards exist
  const standardPoints: [number, number][] = [];
  computedResults.forEach((res) => {
    if (
      res.valid &&
      res.type === 'standard' &&
      res.standardEu !== undefined &&
      Number.isFinite(res.standardEu)
    ) {
      standardPoints.push([res.standardEu, res.rate]);
    }
  });

  // Sort standards by EU concentration
  standardPoints.sort((a, b) => a[0] - b[0]);

  let model: KineticCalibrationModel | null = null;
  if (standardPoints.length >= 2) {
    const reg = linreg(standardPoints);
    const xVals = standardPoints.map((p) => p[0]);
    model = {
      slope: reg.slope,
      intercept: reg.intercept,
      r2: reg.r2,
      stderr: reg.stderr,
      points: standardPoints,
      xMin: Math.min(...xVals),
      xMax: Math.max(...xVals),
    };

    // Calculate estimated EU/mL for unknown samples using the PO curve
    computedResults.forEach((res) => {
      if (res.valid && res.type === 'sample' && model && model.slope !== 0) {
        const est = (res.rate - model.intercept) / model.slope;
        const reported = Math.max(0.0, est);
        res.estimatedEu = est;
        res.reportedEu = reported;
        res.negativeEstimate = Number.isFinite(est) && est < 0;
        res.outOfRange =
          Number.isFinite(est) && (est < model.xMin || est > model.xMax);

        res.status = reported <= thresholdEu ? 'PASS' : 'FLAGGED';

        if (res.outOfRange) {
          res.remark += ` [PO Est: Extrapolated beyond standard curve range (${model.xMin.toFixed(2)}-${model.xMax.toFixed(2)} EU/mL)]`;
        } else if (res.status === 'PASS') {
          res.remark += ` [PO Status: PASS (≤ ${thresholdEu.toFixed(3)} EU/mL)]`;
        } else {
          res.remark += ` [PO Status: FLAGGED (> ${thresholdEu.toFixed(3)} EU/mL threshold)]`;
        }
      }
    });
  }

  return {
    results: computedResults,
    model,
  };
}

export function computeAssayComparison(
  coagResults: SampleEstimateResult[],
  poResults: KineticResult[],
  disagreementThresholdPct: number = 20.0
): AssayComparisonItem[] {
  const validPo = poResults.filter(
    (p) =>
      p.valid &&
      p.type === 'sample' &&
      p.reportedEu !== undefined &&
      Number.isFinite(p.reportedEu)
  );

  const comparisons: AssayComparisonItem[] = [];

  coagResults.forEach((c) => {
    const coagReported = c.reportedEu !== undefined && Number.isFinite(c.reportedEu) ? c.reportedEu : c.eu;
    if (!Number.isFinite(coagReported)) return;

    // Match by normalized sample name
    const normCoagName = c.name.trim().toLowerCase();
    const matchedPo = validPo.find((p) => {
      const normPoName = p.name.trim().toLowerCase();
      return (
        normPoName === normCoagName ||
        normPoName.includes(normCoagName) ||
        normCoagName.includes(normPoName)
      );
    });

    if (matchedPo && matchedPo.reportedEu !== undefined) {
      const coagEu = coagReported;
      const poEu = matchedPo.reportedEu;
      const absDiff = Math.abs(coagEu - poEu);
      const avg = (coagEu + poEu) / 2;
      const rpd = avg > 0 ? (absDiff / avg) * 100.0 : 0.0;
      const ratio = poEu !== 0 ? coagEu / poEu : NaN;

      const agreement: 'AGREE' | 'DISAGREE' =
        rpd <= disagreementThresholdPct ? 'AGREE' : 'DISAGREE';

      let concordance: 'high' | 'moderate' | 'discordant' = 'high';
      let comment = '';

      if (rpd <= 15.0) {
        concordance = 'high';
        comment = `High Concordance (RPD: ${rpd.toFixed(1)}% ≤ 15%). Coagulation gelation and phenoloxidase activation agree closely.`;
      } else if (rpd <= disagreementThresholdPct) {
        concordance = 'moderate';
        comment = `Acceptable Agreement (RPD: ${rpd.toFixed(1)}% ≤ ${disagreementThresholdPct.toFixed(0)}%). Within acceptable biological variation for hemolymph assays.`;
      } else {
        concordance = 'discordant';
        comment = `Discordant (RPD: ${rpd.toFixed(1)}% > ${disagreementThresholdPct.toFixed(0)}%). Disagreement between clotting and enzyme rate — investigate sample matrix interference.`;
      }

      comparisons.push({
        id: `${c.name}_${matchedPo.id}`,
        name: c.name,
        coagEu,
        coagAbs: c.abs,
        coagStatus: c.status,
        poEu,
        poRate: matchedPo.rate,
        poStatus: matchedPo.status || 'PASS',
        absDiff,
        rpd,
        ratio,
        agreement,
        concordance,
        comment,
      });
    }
  });

  return comparisons;
}

/**
 * Computes Bland-Altman agreement analysis for dual-assay endotoxin estimates.
 * Accounts for measurement error in both assays (CLSI EP09-A3 methodology).
 */
export function computeBlandAltman(
  comparisons: AssayComparisonItem[]
): BlandAltmanResult | null {
  const valid = comparisons.filter(
    (c) =>
      Number.isFinite(c.coagEu) &&
      Number.isFinite(c.poEu)
  );

  if (valid.length < 2) return null;

  const diffs = valid.map((c) => c.coagEu - c.poEu);
  const means = valid.map((c) => (c.coagEu + c.poEu) / 2);

  const meanBias = mean(diffs);
  const sdBias = sd(diffs);

  if (!Number.isFinite(meanBias) || !Number.isFinite(sdBias)) return null;

  const upperLoa = meanBias + 1.96 * sdBias;
  const lowerLoa = meanBias - 1.96 * sdBias;

  const n = valid.length;
  const seBias = sdBias / Math.sqrt(n);
  const seLoa = Math.sqrt((3 * (sdBias * sdBias)) / n);

  let withinLoaCount = 0;
  const points: BlandAltmanPoint[] = valid.map((c, i) => {
    const diff = diffs[i];
    const m = means[i];
    const isOutlier = diff > upperLoa || diff < lowerLoa;
    if (!isOutlier) withinLoaCount++;

    return {
      name: c.name,
      mean: m,
      diff,
      rpd: c.rpd,
      isOutlier,
    };
  });

  const percentWithinLoa = n > 0 ? (withinLoaCount / n) * 100 : 0;

  return {
    n,
    meanBias,
    sdBias,
    upperLoa,
    lowerLoa,
    seBias,
    seLoa,
    points,
    withinLoaCount,
    percentWithinLoa,
  };
}

/**
 * Computes Passing-Bablok non-parametric regression.
 * Accounts for measurement errors in both assays, non-normal distributions,
 * and potential extreme values (Passing & Bablok, J Clin Chem Clin Biochem, 1983).
 */
export function computePassingBablok(
  comparisons: AssayComparisonItem[]
): PassingBablokResult | null {
  const valid = comparisons.filter(
    (c) =>
      Number.isFinite(c.coagEu) &&
      Number.isFinite(c.poEu)
  );

  const n = valid.length;
  if (n < 3) return null;

  // Pairwise slopes S_ij
  const slopes: number[] = [];
  let kCount = 0; // count of slopes < -1

  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = valid[j].coagEu - valid[i].coagEu;
      const dy = valid[j].poEu - valid[i].poEu;

      if (Math.abs(dx) > 1e-9) {
        const s = dy / dx;
        if (Math.abs(s + 1) > 1e-9) {
          slopes.push(s);
          if (s < -1) {
            kCount++;
          }
        }
      }
    }
  }

  if (slopes.length === 0) return null;

  slopes.sort((a, b) => a - b);
  const N = slopes.length;

  // Passing-Bablok Median Slope (shifted by K)
  const medianIndex = Math.floor(N / 2);
  const shiftedIndex = Math.min(Math.max(0, medianIndex + kCount), N - 1);
  const slope = slopes[shiftedIndex];

  // 95% Confidence Interval for Slope
  const cAlpha = 1.96 * Math.sqrt((N * (2 * n + 5)) / 18);
  const m1 = Math.max(0, Math.floor((N - cAlpha) / 2));
  const m2 = Math.min(N - 1, Math.ceil((N + cAlpha) / 2));

  const slopeCiLower = slopes[Math.min(Math.max(0, m1 + kCount), N - 1)];
  const slopeCiUpper = slopes[Math.min(Math.max(0, m2 + kCount), N - 1)];

  // Intercept calculation: median of (y_i - B * x_i)
  const diffs = valid.map((p) => p.poEu - slope * p.coagEu);
  diffs.sort((a, b) => a - b);
  const intercept = diffs[Math.floor(diffs.length / 2)];

  // Intercept CI using slope bounds
  const diffsLower = valid.map((p) => p.poEu - slopeCiUpper * p.coagEu);
  diffsLower.sort((a, b) => a - b);
  const interceptCiLower = diffsLower[Math.floor(diffsLower.length / 2)];

  const diffsUpper = valid.map((p) => p.poEu - slopeCiLower * p.coagEu);
  diffsUpper.sort((a, b) => a - b);
  const interceptCiUpper = diffsUpper[Math.floor(diffsUpper.length / 2)];

  // Tests for systematic bias
  // Constant bias exists if 0 is NOT in [interceptCiLower, interceptCiUpper]
  const hasConstantBias =
    !(Math.min(interceptCiLower, interceptCiUpper) <= 0 &&
      Math.max(interceptCiLower, interceptCiUpper) >= 0);

  // Proportional bias exists if 1.0 is NOT in [slopeCiLower, slopeCiUpper]
  const hasProportionalBias =
    !(Math.min(slopeCiLower, slopeCiUpper) <= 1.0 &&
      Math.max(slopeCiLower, slopeCiUpper) >= 1.0);

  // Pearson correlation r & r2 for completeness
  const xMean = mean(valid.map((p) => p.coagEu));
  const yMean = mean(valid.map((p) => p.poEu));
  let sxx = 0;
  let syy = 0;
  let sxy = 0;

  valid.forEach((p) => {
    const dx = p.coagEu - xMean;
    const dy = p.poEu - yMean;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  });

  const denom = Math.sqrt(sxx * syy);
  const pearsonR = denom > 0 ? sxy / denom : 0;
  const r2 = pearsonR * pearsonR;

  const sign = intercept >= 0 ? '+' : '-';
  const equation = `y = ${slope.toFixed(3)}x ${sign} ${Math.abs(intercept).toFixed(3)}`;

  return {
    slope,
    intercept,
    slopeCiLower: Math.min(slopeCiLower, slopeCiUpper),
    slopeCiUpper: Math.max(slopeCiLower, slopeCiUpper),
    interceptCiLower: Math.min(interceptCiLower, interceptCiUpper),
    interceptCiUpper: Math.max(interceptCiLower, interceptCiUpper),
    hasConstantBias,
    hasProportionalBias,
    pearsonR,
    r2,
    equation,
  };
}

/**
 * Computes Deming regression (Orthogonal Least Squares with lambda = 1)
 * when error variances of both coagulation and PO assays are assumed equal.
 */
export function computeDemingRegression(
  comparisons: AssayComparisonItem[]
): DemingResult | null {
  const valid = comparisons.filter(
    (c) =>
      Number.isFinite(c.coagEu) &&
      Number.isFinite(c.poEu)
  );

  const n = valid.length;
  if (n < 2) return null;

  const xMean = mean(valid.map((p) => p.coagEu));
  const yMean = mean(valid.map((p) => p.poEu));

  let sxx = 0;
  let syy = 0;
  let sxy = 0;

  valid.forEach((p) => {
    const dx = p.coagEu - xMean;
    const dy = p.poEu - yMean;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  });

  if (sxy === 0 || sxx === 0) return null;

  // Deming slope with lambda = 1
  const slope = (syy - sxx + Math.sqrt((syy - sxx) ** 2 + 4 * (sxy ** 2))) / (2 * sxy);
  const intercept = yMean - slope * xMean;

  const denom = Math.sqrt(sxx * syy);
  const r = denom > 0 ? sxy / denom : 0;
  const r2 = r * r;

  const sign = intercept >= 0 ? '+' : '-';
  const equation = `y = ${slope.toFixed(3)}x ${sign} ${Math.abs(intercept).toFixed(3)}`;

  return {
    slope,
    intercept,
    equation,
    r2,
  };
}

/**
 * Synthesizes complete Method Comparison Agreement Summary for clinical/analytical reporting.
 */
export function computeAgreementSummary(
  comparisons: AssayComparisonItem[]
): AgreementAnalysisSummary | null {
  const ba = computeBlandAltman(comparisons);
  if (!ba) return null;

  const pb = computePassingBablok(comparisons);
  const deming = computeDemingRegression(comparisons);

  const avgRpd =
    comparisons.reduce((acc, c) => acc + c.rpd, 0) / comparisons.length;

  let statement = '';
  const direction =
    ba.meanBias > 0.005
      ? 'higher'
      : ba.meanBias < -0.005
      ? 'lower'
      : 'virtually identical';

  statement = `The two analytical methods demonstrate an overall mean bias of ${ba.meanBias.toFixed(3)} EU/mL (Coagulation reading on average ${direction} than PO kinetics). The 95% Limits of Agreement span from ${ba.lowerLoa.toFixed(3)} to ${ba.upperLoa.toFixed(3)} EU/mL with ${ba.percentWithinLoa.toFixed(0)}% of matched test samples within limits. Matched samples exhibited a mean Relative Percent Difference (RPD) of ${avgRpd.toFixed(1)}%.`;

  if (pb) {
    if (!pb.hasConstantBias && !pb.hasProportionalBias) {
      statement += ` Passing-Bablok non-parametric regression confirms no significant constant or proportional systematic error (Slope: ${pb.slope.toFixed(2)} [95% CI: ${pb.slopeCiLower.toFixed(2)}–${pb.slopeCiUpper.toFixed(2)}], Intercept: ${pb.intercept.toFixed(3)} [95% CI: ${pb.interceptCiLower.toFixed(3)}–${pb.interceptCiUpper.toFixed(3)}]).`;
    } else {
      statement += ` Passing-Bablok regression notes ${pb.hasProportionalBias ? 'proportional difference' : ''}${pb.hasProportionalBias && pb.hasConstantBias ? ' and ' : ''}${pb.hasConstantBias ? 'constant systematic offset' : ''} between assays (Slope: ${pb.slope.toFixed(2)}, Intercept: ${pb.intercept.toFixed(3)}).`;
    }
  }

  return {
    blandAltman: ba,
    passingBablok: pb || undefined,
    deming: deming || undefined,
    concordanceStatement: statement,
  };
}


