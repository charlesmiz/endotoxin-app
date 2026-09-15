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
  ModelDiagnosticComparison,
  AnalyticalHierarchyStatus,
} from '../types';

/**
 * Arithmetic mean of an array of numbers.
 * Returns NaN if the array is empty.
 */
export function mean(values: number[]): number {
  if (!values.length) return NaN;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Sample standard deviation (degrees of freedom: n - 1).
 * Returns NaN if n < 2.
 */
export function sd(values: number[]): number {
  if (values.length < 2) return NaN;
  const m = mean(values);
  return Math.sqrt(
    values.reduce((a, v) => a + (v - m) ** 2, 0) / (values.length - 1)
  );
}

/**
 * Parses replicate string, returning both valid finite numbers and any invalid tokens.
 * Never silently drops invalid tokens.
 */
export function parseReplicatesDetailed(raw: string): {
  values: number[];
  invalidTokens: string[];
} {
  if (!raw || !raw.trim()) return { values: [], invalidTokens: [] };
  const tokens = raw.trim().split(/[,;\s]+/).filter(Boolean);
  const values: number[] = [];
  const invalidTokens: string[] = [];

  for (const token of tokens) {
    const num = Number(token);
    if (Number.isFinite(num) && !isNaN(num)) {
      values.push(num);
    } else {
      invalidTokens.push(token);
    }
  }

  return { values, invalidTokens };
}

/**
 * Parses replicate string and returns the array of valid numerical values.
 */
export function parseReplicates(raw: string): number[] {
  return parseReplicatesDetailed(raw).values;
}

/**
 * Summarizes replicate measurements with rigorous statistical metrics.
 * Preserves NaN for SD and CV when n < 2 (never returns 0 for non-estimable variance).
 */
export function summarizeReplicates(
  meanValue: number,
  raw: string
): ReplicateSummary {
  const { values: reps, invalidTokens } = parseReplicatesDetailed(raw);
  const values = reps.length
    ? reps
    : Number.isFinite(meanValue)
    ? [meanValue]
    : [];
  const m = values.length ? mean(values) : NaN;
  const s = values.length >= 2 ? sd(values) : NaN;
  const cv =
    values.length >= 2 && Number.isFinite(s) && m !== 0
      ? Math.abs((s / m) * 100)
      : NaN;
  return { values, invalidTokens, mean: m, sd: s, cv, n: values.length };
}

/**
 * Natural logarithm of the Gamma function ln(Γ(z)) using Lanczos approximation (g=7, n=9).
 * Accurate to ~14 decimal places for z > 0.
 */
export function logGamma(z: number): number {
  if (!Number.isFinite(z) || z <= 0) return NaN;
  const p = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109583117182,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  let x = p[0];
  for (let i = 1; i < 9; i++) {
    x += p[i] / (z + i - 1);
  }
  const t = z + 7 - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z - 0.5) * Math.log(t) - t + Math.log(x);
}

/**
 * Continued fraction component of regularized incomplete beta function.
 */
export function betaFraction(a: number, b: number, x: number): number {
  const maxIt = 200;
  const eps = 1e-14;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < eps) d = eps;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= maxIt; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < eps) d = eps;
    c = 1 + aa / c;
    if (Math.abs(c) < eps) c = eps;
    d = 1 / d;
    h *= d * c;

    aa = -((a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
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

/**
 * Regularized incomplete beta function I_x(a, b).
 */
export function betaIncomplete(a: number, b: number, x: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(x)) return NaN;
  if (x < 0 || x > 1 || a <= 0 || b <= 0) return NaN;
  if (x === 0) return 0;
  if (x === 1) return 1;

  const logBeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const factor = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - logBeta);

  if (x < (a + 1) / (a + b + 2)) {
    return (factor * betaFraction(a, b, x)) / a;
  } else {
    return 1 - (factor * betaFraction(b, a, 1 - x)) / b;
  }
}

/**
 * Exact p-value (right tail: P(F >= f)) for the F-distribution with degrees of freedom df1 and df2.
 * Uses exact relation with regularized incomplete beta function:
 * P(F >= f) = I_x(df2/2, df1/2) where x = df2 / (df2 + df1 * f).
 */
export function fDistributionPValue(
  f: number,
  df1: number,
  df2: number
): number {
  if (
    !Number.isFinite(f) ||
    !Number.isFinite(df1) ||
    !Number.isFinite(df2) ||
    df1 <= 0 ||
    df2 <= 0 ||
    f < 0
  ) {
    return NaN;
  }
  if (f === 0) return 1.0;
  const x = df2 / (df2 + df1 * f);
  const p = betaIncomplete(df2 / 2, df1 / 2, x);
  return Math.max(0.0, Math.min(1.0, p));
}

/**
 * Standard Ordinary Least Squares (OLS) Linear Regression: y = slope * x + intercept.
 */
export function linreg(points: [number, number][]): LinRegResult {
  const n = points.length;
  if (n < 2) {
    return {
      slope: NaN,
      intercept: NaN,
      r2: NaN,
      stderr: NaN,
      ssTot: NaN,
      ssReg: NaN,
      ssRes: NaN,
      fStat: NaN,
      pValue: NaN,
      dfReg: 1,
      dfRes: Math.max(0, n - 2),
    };
  }

  const sx = points.reduce((a, p) => a + p[0], 0);
  const sy = points.reduce((a, p) => a + p[1], 0);
  const sxy = points.reduce((a, p) => a + p[0] * p[1], 0);
  const sxx = points.reduce((a, p) => a + p[0] * p[0], 0);
  const den = n * sxx - sx * sx;

  if (Math.abs(den) < 1e-12) {
    return {
      slope: NaN,
      intercept: NaN,
      r2: NaN,
      stderr: NaN,
      ssTot: NaN,
      ssReg: NaN,
      ssRes: NaN,
      fStat: NaN,
      pValue: NaN,
      dfReg: 1,
      dfRes: n - 2,
    };
  }

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
  const dfRes = n - 2;
  let stderr = NaN;
  let fStat = NaN;
  let pValue = NaN;

  if (dfRes > 0 && den > 0) {
    const sxxSample = sxx - (sx * sx) / n;
    const msRes = ssRes / dfRes;
    stderr = sxxSample > 0 ? Math.sqrt(msRes / sxxSample) : NaN;
    const msReg = ssReg / dfReg;
    fStat = msRes > 0 ? msReg / msRes : ssReg > 0 ? Infinity : NaN;
    pValue = Number.isFinite(fStat)
      ? fDistributionPValue(fStat, dfReg, dfRes)
      : NaN;
  }

  return {
    slope,
    intercept,
    r2,
    stderr,
    ssTot,
    ssReg,
    ssRes,
    fStat,
    pValue,
    dfReg,
    dfRes,
  };
}

/**
 * Computes the regression ANOVA table.
 * Does NOT force degrees of freedom to 1:
 * dfRes = n - 2. If dfRes <= 0, statistical quantities are NaN with status 'INSUFFICIENT_DF'.
 */
export function computeAnovaTable(
  points: [number, number][],
  lin: LinRegResult
): AnovaTable {
  const n = points.length;
  const ssTot = lin.ssTot ?? NaN;
  const ssRes = lin.ssRes ?? NaN;
  const ssReg = lin.ssReg ?? NaN;
  const dfReg = 1;
  const dfRes = n - 2;
  const dfTot = n - 1;

  if (dfRes <= 0 || !Number.isFinite(ssRes) || !Number.isFinite(ssTot)) {
    return {
      ssReg: Number.isFinite(ssReg) ? ssReg : NaN,
      dfReg,
      msReg: Number.isFinite(ssReg) ? ssReg / dfReg : NaN,
      ssRes: Number.isFinite(ssRes) ? ssRes : NaN,
      dfRes,
      msRes: NaN,
      ssTot: Number.isFinite(ssTot) ? ssTot : NaN,
      dfTot,
      fStat: NaN,
      pValue: NaN,
      status: 'INSUFFICIENT_DF',
    };
  }

  const msReg = ssReg / dfReg;
  const msRes = ssRes / dfRes;
  const fStat = msRes > 0 ? msReg / msRes : ssReg === 0 ? NaN : Infinity;
  const pValue = Number.isFinite(fStat)
    ? fDistributionPValue(fStat, dfReg, dfRes)
    : NaN;

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
    status: 'VALID',
  };
}

/**
 * Second-order polynomial regression: y = a*x^2 + b*x + c.
 * Solved via Gaussian elimination with partial pivoting.
 */
export function quadreg(points: [number, number][]): QuadRegResult {
  const n = points.length;
  if (n < 3) {
    return {
      a: NaN,
      b: NaN,
      c: NaN,
      r2: NaN,
      dfRes: Math.max(0, n - 3),
    };
  }

  let s0 = n,
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
    for (let r = col + 1; r < 3; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    if (Math.abs(M[pivot][col]) < 1e-12) {
      return { a: NaN, b: NaN, c: NaN, r2: NaN, dfRes: n - 3 };
    }
    [M[col], M[pivot]] = [M[pivot], M[col]];
    const pv = M[col][col];
    for (let j = col; j < 4; j++) M[col][j] /= pv;
    for (let r = 0; r < 3; r++) {
      if (r !== col) {
        const f = M[r][col];
        for (let j = col; j < 4; j++) M[r][j] -= f * M[col][j];
      }
    }
  }

  const [a, b, c] = [M[0][3], M[1][3], M[2][3]];
  const meanY = points.reduce((q, p) => q + p[1], 0) / n;
  const ssTot = points.reduce((q, p) => q + (p[1] - meanY) ** 2, 0);
  const ssRes = points.reduce(
    (q, p) => q + (p[1] - (a * p[0] * p[0] + b * p[0] + c)) ** 2,
    0
  );
  const ssReg = Math.max(0, ssTot - ssRes);
  const r2 = ssTot === 0 ? NaN : Math.max(0, Math.min(1, 1 - ssRes / ssTot));
  const dfRes = n - 3;
  const stderr = dfRes > 0 ? Math.sqrt(ssRes / dfRes) : NaN;

  return { a, b, c, r2, stderr, ssTot, ssRes, ssReg, dfRes };
}

/**
 * Inverts the quadratic calibration equation y = a*x^2 + b*x + c for a given absorbance y.
 * Safely handles:
 * - Near-zero a (degenerates to linear)
 * - Near-zero a and b (horizontal line -> no solution)
 * - Negative discriminant (no real roots)
 * - Multiple roots in standard range (ambiguous)
 */
export function invertQuadratic(
  model: { a: number; b: number; c: number },
  y: number,
  xMin: number,
  xMax: number
): { roots: number[]; ambiguous: boolean; noSolution: boolean } {
  const A = model.a;
  const B = model.b;
  const C = model.c - y;

  if (Math.abs(A) < 1e-12) {
    if (Math.abs(B) < 1e-12) {
      return { roots: [], ambiguous: false, noSolution: true };
    }
    const root = (y - model.c) / B;
    return { roots: [root], ambiguous: false, noSolution: false };
  }

  const disc = B * B - 4 * A * C;
  if (disc < 0) {
    return { roots: [], ambiguous: false, noSolution: true };
  }

  const r = Math.sqrt(disc);
  const root1 = (-B + r) / (2 * A);
  const root2 = (-B - r) / (2 * A);

  const candidateRoots = [root1, root2].filter(Number.isFinite);
  const inRangeRoots = candidateRoots.filter(
    (x) => x >= xMin - 1e-9 && x <= xMax + 1e-9
  );

  const uniqueInRange = inRangeRoots.filter(
    (val, idx, arr) => arr.findIndex((v) => Math.abs(v - val) < 1e-7) === idx
  );

  if (uniqueInRange.length === 1) {
    return { roots: uniqueInRange, ambiguous: false, noSolution: false };
  } else if (uniqueInRange.length > 1) {
    return { roots: uniqueInRange, ambiguous: true, noSolution: false };
  } else {
    if (candidateRoots.length > 0) {
      return {
        roots: candidateRoots,
        ambiguous: candidateRoots.length > 1,
        noSolution: false,
      };
    }
    return { roots: [], ambiguous: false, noSolution: true };
  }
}

/**
 * Rigorous model diagnostics evaluating whether quadratic curvature is statistically
 * justified over linear regression using partial F-test and physical monotonicity criteria.
 */
export function evaluateModelDiagnostics(
  points: [number, number][],
  linear: LinRegResult,
  quad: QuadRegResult
): ModelDiagnosticComparison {
  const n = points.length;
  const linearR2 = Number.isFinite(linear.r2) ? linear.r2 : 0;
  const quadR2 = Number.isFinite(quad.r2) ? quad.r2 : 0;
  const deltaR2 = quadR2 - linearR2;

  const xVals = points.map((p) => p[0]);
  const xMin = Math.min(...xVals);
  const xMax = Math.max(...xVals);

  // Monotonicity check: quadratic vertex is at -b / (2*a)
  let isMonotonicInRange = true;
  if (
    Number.isFinite(quad.a) &&
    Math.abs(quad.a) > 1e-9 &&
    Number.isFinite(quad.b)
  ) {
    const vertexX = -quad.b / (2 * quad.a);
    if (
      vertexX > xMin + 0.05 * (xMax - xMin) &&
      vertexX < xMax - 0.05 * (xMax - xMin)
    ) {
      isMonotonicInRange = false;
    }
  }

  let fStatImprovement: number | undefined;
  let pValueImprovement: number | undefined;
  let isCurvatureStatisticallySignificant = false;

  if (
    n >= 5 &&
    Number.isFinite(linear.ssRes) &&
    Number.isFinite(quad.ssRes)
  ) {
    const dfResQuad = n - 3;
    const msImprovement = Math.max(0, linear.ssRes! - quad.ssRes!);
    const msResQuad = quad.ssRes! / dfResQuad;
    if (msResQuad > 0) {
      fStatImprovement = msImprovement / msResQuad;
      pValueImprovement = fDistributionPValue(fStatImprovement, 1, dfResQuad);
      isCurvatureStatisticallySignificant =
        Number.isFinite(pValueImprovement) &&
        pValueImprovement < 0.05 &&
        deltaR2 > 0.01;
    }
  }

  let recommendation: 'linear' | 'quadratic' = 'linear';
  let rationalExplanation = '';

  if (!isMonotonicInRange) {
    recommendation = 'linear';
    rationalExplanation =
      'Linear model recommended: Quadratic curve exhibits a local extremum (direction reversal) within standard range, violating physical monotonicity.';
  } else if (n < 5) {
    recommendation = 'linear';
    rationalExplanation =
      'Linear model recommended: Standards count (n < 5) is insufficient to justify a 2nd-order polynomial without risk of overfitting.';
  } else if (isCurvatureStatisticallySignificant) {
    recommendation = 'quadratic';
    rationalExplanation = `Quadratic model supported: Partial F-test confirms statistically significant curvature reduction (F = ${fStatImprovement?.toFixed(2)}, p = ${pValueImprovement?.toFixed(4)} < 0.05, ΔR² = +${(deltaR2 * 100).toFixed(1)}%) with preserved monotonicity.`;
  } else {
    recommendation = 'linear';
    rationalExplanation = `Linear model recommended by parsimony: Curvature is not statistically significant (p = ${pValueImprovement !== undefined ? pValueImprovement.toFixed(4) : 'N/A'} ≥ 0.05). First-order model preferred.`;
  }

  return {
    linearR2,
    quadR2,
    deltaR2,
    fStatImprovement,
    pValueImprovement,
    isCurvatureStatisticallySignificant,
    isMonotonicInRange,
    recommendation,
    rationalExplanation,
  };
}

/**
 * Model selection based on user choice or documented statistical diagnostics.
 */
export function chooseModel(
  points: [number, number][],
  requested: string
): CalibrationModelFit {
  const linear = linreg(points);
  const quad = quadreg(points);
  const anova = computeAnovaTable(points, linear);
  const diagnostics = evaluateModelDiagnostics(points, linear, quad);

  const xVals = points.map((p) => p[0]);
  const xMin = points.length ? Math.min(...xVals) : 0;
  const xMax = points.length ? Math.max(...xVals) : 0;

  let selectedType: 'linear' | 'quadratic' = 'linear';
  if (requested === 'linear') {
    selectedType = 'linear';
  } else if (requested === 'quadratic') {
    selectedType = 'quadratic';
  } else if (requested === 'auto') {
    selectedType = diagnostics.recommendation;
  }

  const validationErrors: string[] = [];
  let isValidCalibration = true;

  if (selectedType === 'linear') {
    if (!Number.isFinite(linear.slope) || linear.slope <= 0) {
      isValidCalibration = false;
      validationErrors.push(
        `Non-positive linear slope (slope = ${Number.isFinite(linear.slope) ? linear.slope.toFixed(5) : 'NaN'}). Turbidity must increase with endotoxin concentration.`
      );
    }
  } else {
    if (!diagnostics.isMonotonicInRange) {
      validationErrors.push(
        'Quadratic model vertex is within assay range. Non-monotonic optical density.'
      );
    }
    if (!Number.isFinite(quad.r2)) {
      isValidCalibration = false;
      validationErrors.push(
        'Quadratic model failed to compute or has insufficient degrees of freedom.'
      );
    }
  }

  return {
    type: selectedType,
    model: selectedType,
    requestedModel: requested,
    slope: linear.slope,
    intercept: linear.intercept,
    a: quad.a,
    b: quad.b,
    c: quad.c,
    r2: selectedType === 'linear' ? linear.r2 : quad.r2,
    points,
    meta: [],
    xMin,
    xMax,
    linear,
    quad,
    anova,
    diagnostics,
    exploratory: selectedType === 'quadratic',
    isValidCalibration,
    validationErrors,
  };
}

/**
 * Computes sample endotoxin estimates from calibration fit.
 *
 * Strict Rules Enforced:
 * 1. No slope clamp (invalid slope invalidates calibration).
 * 2. Threshold is an explicit required argument.
 * 3. Raw mathematical estimate is preserved separately from reportable value.
 * 4. Out-of-range samples are flagged and not presented as ordinary valid quantitative results;
 *    dilution factor is applied: originalConcentration = measured * dilutionFactor.
 * 5. Analytical status is strictly hierarchical:
 *    INVALID_INPUT -> INVALID_CALIBRATION -> NO_SOLUTION -> AMBIGUOUS -> BELOW_BLANK -> OUT_OF_RANGE -> WITHIN_RANGE.
 */
export function computeSampleEstimates(
  calibration: CalibrationModelFit | null,
  samples: {
    id?: string;
    sampleId?: string;
    name: string;
    abs: number;
    sd?: number;
    cv?: number;
    n?: number;
    replicates?: number[];
    invalidTokens?: string[];
    dilutionFactor?: number;
  }[],
  thresholdEu: number, // Explicit required argument
  runId: string = 'Run 1'
): SampleEstimateResult[] {
  const points = calibration?.points ?? [];
  const absValues = points.map((p) => p[1]);
  const absMin = absValues.length ? Math.min(...absValues) : NaN;
  const absMax = absValues.length ? Math.max(...absValues) : NaN;

  return samples.map((s, idx) => {
    const id = s.id || `s_${idx + 1}`;
    const sampleId = (s.sampleId && s.sampleId.trim()) || `S${idx + 1}`;
    const name = s.name.trim() || `Sample ${idx + 1}`;
    const df = s.dilutionFactor && s.dilutionFactor > 0 ? s.dilutionFactor : 1;
    const sdVal = s.sd !== undefined ? s.sd : NaN;
    const cvVal = s.cv !== undefined ? s.cv : NaN;
    const nVal = s.n !== undefined ? s.n : (s.replicates?.length || 1);
    const replicates = s.replicates || [];
    const invalidTokens = s.invalidTokens || [];

    let rawEu = NaN;
    let reportedEu: number | null = null;
    let originalConcentration: number | null = null;
    let reportableText = '';
    let analyticalStatus: AnalyticalHierarchyStatus = 'WITHIN_RANGE';
    let compliance: 'PASS' | 'FLAGGED' | 'INCONCLUSIVE' = 'FLAGGED';
    let remark = '';
    let outOfRange = false;
    let invalidInput = false;
    let negativeEstimate = false;
    let ambiguous = false;
    let noSolution = false;

    // 1. Check Input Validity
    if (!Number.isFinite(s.abs) || s.abs < 0) {
      invalidInput = true;
      analyticalStatus = 'INVALID_INPUT';
      compliance = 'INCONCLUSIVE';
      reportableText = 'Invalid optical absorbance (A < 0)';
      remark =
        'Invalid negative or non-finite absorbance reading. Verify spectrophotometer baseline zero.';
      return {
        id,
        sampleId,
        runId,
        name,
        abs: s.abs,
        sd: sdVal,
        cv: cvVal,
        n: nVal,
        replicates,
        invalidTokens,
        rawEu: NaN,
        eu: NaN,
        reportedEu: null,
        dilutionFactor: df,
        originalConcentration: null,
        reportableText,
        analyticalStatus,
        compliance,
        status: 'FLAGGED',
        remark,
        outOfRange: false,
        invalidInput: true,
        negativeEstimate: false,
        ambiguous: false,
        noSolution: false,
      };
    }

    // 2. Check Calibration Validity (DO NOT clamp slope!)
    const isCalValid =
      calibration &&
      calibration.isValidCalibration &&
      (calibration.type === 'linear'
        ? Number.isFinite(calibration.slope) && calibration.slope! > 0
        : Number.isFinite(calibration.a) && Number.isFinite(calibration.b));

    if (!isCalValid) {
      analyticalStatus = 'INVALID_CALIBRATION';
      compliance = 'INCONCLUSIVE';
      reportableText = 'Calibration invalid (slope ≤ 0 or ill-conditioned)';
      remark =
        'Invalid or uncomputed calibration model. Inverted concentration estimation is disabled.';
      return {
        id,
        sampleId,
        runId,
        name,
        abs: s.abs,
        sd: sdVal,
        cv: cvVal,
        n: nVal,
        replicates,
        invalidTokens,
        rawEu: NaN,
        eu: NaN,
        reportedEu: null,
        dilutionFactor: df,
        originalConcentration: null,
        reportableText,
        analyticalStatus,
        compliance,
        status: 'FLAGGED',
        remark,
        outOfRange: false,
        invalidInput: false,
        negativeEstimate: false,
        ambiguous: false,
        noSolution: false,
      };
    }

    // 3. Mathematical Model Inversion
    if (calibration.type === 'linear') {
      const slope = calibration.slope!;
      const intercept = calibration.intercept!;
      rawEu = (s.abs - intercept) / slope;
    } else {
      const inv = invertQuadratic(
        { a: calibration.a!, b: calibration.b!, c: calibration.c! },
        s.abs,
        calibration.xMin,
        calibration.xMax
      );
      ambiguous = inv.ambiguous;
      noSolution = inv.noSolution;
      if (inv.roots.length > 0) {
        rawEu = inv.roots[0];
      }
    }

    negativeEstimate = Number.isFinite(rawEu) && rawEu < 0;

    // 4. Check for No Solution or Ambiguous Roots
    if (noSolution) {
      analyticalStatus = 'NO_SOLUTION';
      compliance = 'INCONCLUSIVE';
      reportableText = 'No real calibration curve root';
      remark =
        'Absorbance does not intersect valid polynomial calibration curve.';
    } else if (ambiguous) {
      analyticalStatus = 'AMBIGUOUS';
      compliance = 'INCONCLUSIVE';
      reportableText = 'Ambiguous roots in calibration range';
      remark =
        'Multiple mathematical roots exist in standard range. Re-verify linear response range.';
    } else if (s.abs < absMin) {
      // 5. Below Analytical Blank
      analyticalStatus = 'BELOW_BLANK';
      reportedEu = null;
      originalConcentration = null;
      reportableText = `< LOD (< ${absMin.toFixed(4)} OD blank)`;
      compliance = 'PASS';
      remark = `Below analytical blank (${s.abs.toFixed(4)} < ${absMin.toFixed(4)} OD). Endotoxin non-quantifiable (< LOD). Evaluated below study threshold with analytical qualification.`;
    } else if (s.abs > absMax) {
      // 6. Extrapolated / Out of Range
      outOfRange = true;
      analyticalStatus = 'OUT_OF_RANGE';
      reportedEu = null;
      originalConcentration = null;
      reportableText = `> Standard Range (> ${absMax.toFixed(4)} OD) [Dilution Required]`;
      compliance = 'FLAGGED';
      remark = `Extrapolated reading (${s.abs.toFixed(4)} OD > upper standard ${absMax.toFixed(4)} OD). Sample dilution required for quantitative estimation.`;
    } else {
      // 7. Within Valid Calibration Range
      analyticalStatus = 'WITHIN_RANGE';
      reportedEu = rawEu;
      originalConcentration = reportedEu * df;

      const evalConc = originalConcentration;
      const isAbove = evalConc > thresholdEu;
      compliance = isAbove ? 'FLAGGED' : 'PASS';
      reportableText =
        df > 1
          ? `${evalConc.toFixed(3)} EU/mL (DF: ${df}×)`
          : `${reportedEu.toFixed(3)} EU/mL`;

      remark = isAbove
        ? `Above configured study threshold (${evalConc.toFixed(3)} > ${thresholdEu.toFixed(3)} EU/mL); analytical follow-up recommended.`
        : `Below configured study threshold (${evalConc.toFixed(3)} ≤ ${thresholdEu.toFixed(3)} EU/mL).`;
    }

    const legacyStatus: 'PASS' | 'FLAGGED' =
      compliance === 'PASS' ? 'PASS' : 'FLAGGED';

    return {
      id,
      sampleId,
      runId,
      name,
      abs: s.abs,
      sd: sdVal,
      cv: cvVal,
      n: nVal,
      replicates,
      invalidTokens,
      rawEu,
      eu: rawEu,
      reportedEu,
      dilutionFactor: df,
      originalConcentration,
      reportableText,
      analyticalStatus,
      compliance,
      status: legacyStatus,
      remark,
      outOfRange,
      invalidInput,
      negativeEstimate,
      ambiguous,
      noSolution,
    };
  });
}

/**
 * Computes Phenoloxidase kinetic reaction rates & calibration model.
 * Supports direct pre-calculated rates and raw time-series measurements.
 * Threshold is an explicit required argument.
 */
export function computeKineticRates(
  timePoints: number[],
  rows: KineticSampleRow[],
  thresholdEu: number = 0.25,
  runId: string = 'Run 1'
): {
  results: KineticResult[];
  model: KineticCalibrationModel | null;
} {
  const computedResults: KineticResult[] = rows.map((row, idx) => {
    const id = row.id || `k_${idx + 1}`;
    const sampleId = (row.sampleId && row.sampleId.trim()) || `K_S${idx + 1}`;
    const mode = row.inputMode || 'series';
    const isStandard = row.type === 'standard';
    const stdEuNum =
      isStandard && row.standardEu !== undefined && row.standardEu.trim() !== ''
        ? parseFloat(row.standardEu)
        : undefined;

    // MODE 1: Direct Pre-calculated Rate
    if (mode === 'direct_rate') {
      const rateVal =
        row.directRate !== undefined && row.directRate.trim() !== ''
          ? parseFloat(row.directRate)
          : NaN;

      const isValid = Number.isFinite(rateVal) && Boolean(row.name.trim());
      const activityLevel: 'baseline' | 'active' | 'high' =
        rateVal >= 0.01
          ? 'high'
          : rateVal < 0.001
          ? 'baseline'
          : 'active';

      let remark = '';
      if (!isValid) {
        remark = 'Missing or non-finite direct rate reading (dA/min).';
      } else if (activityLevel === 'high') {
        remark =
          'High enzymatic velocity (dA/dt ≥ 0.010 OD/min, exploratory threshold). Strong proPO cascade activation.';
      } else if (activityLevel === 'baseline') {
        remark =
          'Baseline rate (< 0.001 OD/min, exploratory threshold). Negligible substrate turnover.';
      } else {
        remark =
          'Active phenoloxidase turnover (0.001 ≤ dA/dt < 0.010 OD/min, exploratory threshold).';
      }

      return {
        id,
        sampleId,
        runId,
        name: row.name.trim() || 'Unnamed Sample',
        type: row.type,
        inputMode: 'direct_rate',
        standardEu: stdEuNum,
        timePoints: [],
        absReadings: [],
        rate: rateVal,
        rateSource: 'direct_input',
        r2: NaN, // Do NOT invent 1.0!
        deltaAbs: NaN,
        initialAbs: NaN,
        finalAbs: NaN,
        stderr: NaN,
        activityLevel,
        activityThresholdType: 'exploratory_reference',
        remark,
        valid: isValid,
      };
    }

    // MODE 2: Raw Absorbance Time-Series
    const sortedTimes = [...timePoints].sort((a, b) => a - b);
    const regStart = row.linearRegionStart ?? sortedTimes[0] ?? 0;
    const regEnd =
      row.linearRegionEnd ?? sortedTimes[sortedTimes.length - 1] ?? 10;

    const validPairs: [number, number][] = [];
    const pairedTimes: number[] = [];
    const pairedAbs: number[] = [];

    sortedTimes.forEach((t) => {
      if (t >= regStart && t <= regEnd) {
        const valStr = row.readings[t];
        if (valStr !== undefined && valStr.trim() !== '') {
          const val = parseFloat(valStr);
          if (Number.isFinite(val)) {
            validPairs.push([t, val]);
            pairedTimes.push(t);
            pairedAbs.push(val);
          }
        }
      }
    });

    if (validPairs.length < 2 || !row.name.trim()) {
      return {
        id,
        sampleId,
        runId,
        name: row.name.trim() || 'Unnamed Sample',
        type: row.type,
        inputMode: 'series',
        standardEu: stdEuNum,
        timePoints: pairedTimes,
        selectedTimeRange: [regStart, regEnd],
        absReadings: pairedAbs,
        rate: NaN,
        rateSource: 'time_series_fit',
        r2: NaN,
        deltaAbs: NaN,
        initialAbs: pairedAbs.length > 0 ? pairedAbs[0] : NaN,
        finalAbs: pairedAbs.length > 0 ? pairedAbs[pairedAbs.length - 1] : NaN,
        activityLevel: 'baseline',
        activityThresholdType: 'exploratory_reference',
        remark:
          'Insufficient readings in selected kinetic interval (minimum 2 points required for dA/dt fit).',
        valid: false,
      };
    }

    const reg = linreg(validPairs);
    const initialAbs = pairedAbs[0];
    const finalAbs = pairedAbs[pairedAbs.length - 1];
    const deltaAbs = finalAbs - initialAbs;
    const rateVal = reg.slope;

    const activityLevel: 'baseline' | 'active' | 'high' =
      rateVal >= 0.01
        ? 'high'
        : rateVal < 0.001
        ? 'baseline'
        : 'active';

    let remark = '';
    if (activityLevel === 'high') {
      remark = `High velocity (dA/dt = ${rateVal.toFixed(4)} OD/min, R² = ${reg.r2.toFixed(3)}, interval ${regStart}-${regEnd} min). Strong dopachrome formation.`;
    } else if (activityLevel === 'baseline') {
      remark = `Baseline activation (< 0.001 OD/min). Minimal background optical change.`;
    } else {
      remark = `Active enzyme turnover (dA/dt = ${rateVal.toFixed(4)} OD/min, R² = ${reg.r2.toFixed(3)}).`;
    }

    return {
      id,
      sampleId,
      runId,
      name: row.name.trim(),
      type: row.type,
      inputMode: 'series',
      standardEu: stdEuNum,
      timePoints: pairedTimes,
      selectedTimeRange: [regStart, regEnd],
      absReadings: pairedAbs,
      rate: rateVal,
      rateSource: 'time_series_fit',
      r2: reg.r2,
      stderr: reg.stderr,
      deltaAbs,
      initialAbs,
      finalAbs,
      activityLevel,
      activityThresholdType: 'exploratory_reference',
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

  standardPoints.sort((a, b) => a[0] - b[0]);

  let model: KineticCalibrationModel | null = null;
  if (standardPoints.length >= 2) {
    const reg = linreg(standardPoints);
    const xVals = standardPoints.map((p) => p[0]);
    const isValidSlope = Number.isFinite(reg.slope) && reg.slope > 0;

    model = {
      slope: reg.slope,
      intercept: reg.intercept,
      r2: reg.r2,
      stderr: reg.stderr,
      points: standardPoints,
      xMin: Math.min(...xVals),
      xMax: Math.max(...xVals),
      isValid: isValidSlope,
      validationError: isValidSlope
        ? undefined
        : `PO calibration curve slope is non-positive (slope = ${reg.slope.toFixed(4)}). Inverted EU/mL estimation disabled.`,
    };

    // Calculate estimated EU/mL for unknown samples using the PO curve
    if (model.isValid) {
      const minRate = Math.min(...standardPoints.map((p) => p[1]));
      const maxRate = Math.max(...standardPoints.map((p) => p[1]));

      computedResults.forEach((res) => {
        if (res.valid && res.type === 'sample' && model && model.slope > 0) {
          const rawEst = (res.rate - model.intercept) / model.slope;
          res.estimatedEu = rawEst;

          if (res.rate < minRate) {
            res.analyticalStatus = 'BELOW_BLANK';
            res.reportedEu = null;
            res.reportableText = `< LOD (< ${minRate.toFixed(4)} OD/min)`;
            res.compliance = 'PASS';
            res.status = 'PASS';
            res.remark += ` [PO: Below blank velocity (< LOD)]`;
          } else if (res.rate > maxRate) {
            res.outOfRange = true;
            res.analyticalStatus = 'OUT_OF_RANGE';
            res.reportedEu = null;
            res.reportableText = `> PO Range (> ${maxRate.toFixed(4)} OD/min) [Dilution Required]`;
            res.compliance = 'FLAGGED';
            res.status = 'FLAGGED';
            res.remark += ` [PO: Extrapolated beyond standard curve range (${model.xMin.toFixed(2)}-${model.xMax.toFixed(2)} EU/mL)]`;
          } else {
            res.analyticalStatus = 'WITHIN_RANGE';
            res.reportedEu = rawEst;
            res.reportableText = `${rawEst.toFixed(3)} EU/mL`;
            const isAbove = rawEst > thresholdEu;
            res.compliance = isAbove ? 'FLAGGED' : 'PASS';
            res.status = isAbove ? 'FLAGGED' : 'PASS';
            res.remark += isAbove
              ? ` [PO Status: Above configured study threshold (> ${thresholdEu.toFixed(3)} EU/mL); analytical follow-up recommended]`
              : ` [PO Status: Below configured study threshold (≤ ${thresholdEu.toFixed(3)} EU/mL)]`;
          }
        }
      });
    }
  }

  return {
    results: computedResults,
    model,
  };
}

/**
 * Exact critical value for two-tailed Student's t-distribution at alpha = 0.05 (95% confidence).
 * Uses standard table values for df <= 30 and Cornish-Fisher expansion for df > 30.
 */
export function getStudentTCritical(df: number): number {
  if (df <= 0) return 1.96;
  const tTable: Record<number, number> = {
    1: 12.7062,
    2: 4.3027,
    3: 3.1824,
    4: 2.7764,
    5: 2.5706,
    6: 2.4469,
    7: 2.3646,
    8: 2.306,
    9: 2.2622,
    10: 2.2281,
    11: 2.201,
    12: 2.1788,
    13: 2.1604,
    14: 2.1448,
    15: 2.1314,
    16: 2.1199,
    17: 2.1098,
    18: 2.1009,
    19: 2.093,
    20: 2.086,
    21: 2.0796,
    22: 2.0739,
    23: 2.0687,
    24: 2.0639,
    25: 2.0595,
    26: 2.0555,
    27: 2.0518,
    28: 2.0484,
    29: 2.0452,
    30: 2.0423,
    40: 2.0211,
    60: 2.0003,
    120: 1.9799,
  };

  const roundedDf = Math.round(df);
  if (tTable[roundedDf]) return tTable[roundedDf];

  if (roundedDf > 30) {
    const z = 1.95996398454;
    return (
      z +
      (z * z * z + z) / (4 * roundedDf) +
      (5 * Math.pow(z, 5) + 16 * Math.pow(z, 3) + 3 * z) /
        (96 * roundedDf * roundedDf)
    );
  }

  const floor = Math.floor(df);
  const ceil = Math.ceil(df);
  if (floor === ceil) return tTable[floor] || 1.96;
  const tFloor = tTable[floor] || 2.0;
  const tCeil = tTable[ceil] || 2.0;
  return tFloor + (df - floor) * (tCeil - tFloor);
}

/**
 * Two-tailed p-value for Student's t distribution with df degrees of freedom.
 */
export function studentTPValue(t: number, df: number): number {
  if (!Number.isFinite(t) || !Number.isFinite(df) || df <= 0) return NaN;
  if (t === 0) return 1.0;
  const x = df / (df + t * t);
  return betaIncomplete(df / 2, 0.5, x);
}

/**
 * Pairs Coagulation and Phenoloxidase results strictly by sampleId and runId.
 * Never pairs rows by display-name substring matching.
 * Excludes non-quantifiable (below-blank or out-of-range) observations from quantitative statistics.
 */
export function computeAssayComparison(
  coagResults: SampleEstimateResult[],
  poResults: KineticResult[],
  disagreementThresholdPct: number = 20.0,
  targetRunId?: string,
  tier1RpdPct: number = 15.0,
  lowConcThresholdEu: number = 0.05
): AssayComparisonItem[] {
  const comparisons: AssayComparisonItem[] = [];

  const eligiblePo = poResults.filter(
    (p) => p.valid && p.type === 'sample' && (!targetRunId || p.runId === targetRunId)
  );

  coagResults.forEach((c) => {
    if (targetRunId && c.runId !== targetRunId) return;

    // Strict pairing by sampleId
    const cSampleId = (c.sampleId || '').trim().toUpperCase();
    if (!cSampleId) return;

    const matchedPo = eligiblePo.find(
      (p) => (p.sampleId || '').trim().toUpperCase() === cSampleId
    );

    if (matchedPo) {
      const isCoagQuantifiable =
        c.analyticalStatus === 'WITHIN_RANGE' &&
        c.reportedEu !== null &&
        Number.isFinite(c.reportedEu);

      const isPoQuantifiable =
        matchedPo.analyticalStatus === 'WITHIN_RANGE' &&
        matchedPo.reportedEu !== null &&
        matchedPo.reportedEu !== undefined &&
        Number.isFinite(matchedPo.reportedEu);

      const isEligibleForQuantitativeStats =
        isCoagQuantifiable && isPoQuantifiable;

      let exclusionReason: string | undefined;
      if (!isCoagQuantifiable) {
        exclusionReason = `Coagulation: ${c.reportableText || c.analyticalStatus}`;
      } else if (!isPoQuantifiable) {
        exclusionReason = `Phenoloxidase: ${matchedPo.reportableText || matchedPo.analyticalStatus || 'Not quantifiable'}`;
      }

      let coagEu: number | null = null;
      let poEu: number | null = null;
      let absDiff: number | null = null;
      let rpd: number | null = null;
      let ratio: number | null = null;
      let isLowConcentration = false;
      let lowConcentrationWarning: string | undefined;
      let agreement: 'AGREE' | 'DISAGREE' | 'EXCLUDED' = 'EXCLUDED';
      let concordance: 'high' | 'moderate' | 'discordant' | 'non_quantifiable' =
        'non_quantifiable';
      let comment = '';

      if (isEligibleForQuantitativeStats) {
        coagEu = c.reportedEu! * c.dilutionFactor;
        poEu = matchedPo.reportedEu!;
        absDiff = Math.abs(coagEu - poEu);
        const avg = (coagEu + poEu) / 2;
        rpd = avg > 0 ? (absDiff / avg) * 100 : 0;
        ratio = poEu > 0 ? coagEu / poEu : null;

        if (avg < lowConcThresholdEu) {
          isLowConcentration = true;
          lowConcentrationWarning = `Low concentration (< ${lowConcThresholdEu.toFixed(3)} EU/mL): RPD is mathematically amplified by baseline optical noise. Prioritize absolute difference |ΔEU| = ${absDiff.toFixed(4)} EU/mL.`;
        }

        agreement = rpd <= disagreementThresholdPct ? 'AGREE' : 'DISAGREE';

        if (rpd <= tier1RpdPct) {
          concordance = 'high';
          comment = `Tier 1 Exploratory Agreement (RPD: ${rpd.toFixed(1)}% ≤ ${tier1RpdPct}% [study-defined criterion], |ΔEU| = ${absDiff.toFixed(4)}).`;
        } else if (rpd <= disagreementThresholdPct) {
          concordance = 'moderate';
          comment = `Tier 2 Exploratory Agreement (RPD: ${rpd.toFixed(1)}% ≤ ${disagreementThresholdPct.toFixed(0)}% [study-defined criterion], |ΔEU| = ${absDiff.toFixed(4)}).`;
        } else {
          concordance = 'discordant';
          comment = `Discordant (RPD: ${rpd.toFixed(1)}% > ${disagreementThresholdPct.toFixed(0)}%, |ΔEU| = ${absDiff.toFixed(4)}). Disagreement between clotting and enzyme rate — investigate matrix interference or reaction kinetics.`;
        }
      } else {
        agreement = 'EXCLUDED';
        concordance = 'non_quantifiable';
        comment = `Excluded from quantitative comparison statistics: ${exclusionReason}.`;
      }

      comparisons.push({
        id: `${c.sampleId}_${matchedPo.id}`,
        sampleId: c.sampleId,
        runId: c.runId || 'Run 1',
        name: c.name,
        coagEu,
        coagRawEu: c.rawEu,
        coagAbs: c.abs,
        coagStatus: c.status,
        coagAnalyticalStatus: c.analyticalStatus,
        poEu,
        poRawEu: matchedPo.estimatedEu ?? NaN,
        poRate: matchedPo.rate,
        poStatus: matchedPo.status || 'PASS',
        poAnalyticalStatus: matchedPo.analyticalStatus,
        isEligibleForQuantitativeStats,
        exclusionReason,
        absDiff,
        rpd,
        ratio,
        isLowConcentration,
        lowConcentrationWarning,
        agreement,
        concordance,
        comment,
      });
    }
  });

  return comparisons;
}

/**
 * Computes Bland-Altman agreement analysis for quantitatively eligible samples (CLSI EP09-A3).
 * Includes 95% Confidence Intervals for mean bias and limits of agreement,
 * diagnostic tests for proportional bias and heteroscedasticity, small sample warnings,
 * and a priori allowable difference margin evaluation.
 */
export function computeBlandAltman(
  comparisons: AssayComparisonItem[],
  allowableDifferenceMargin?: number,
  lowConcThresholdEu: number = 0.05
): BlandAltmanResult | null {
  const valid = comparisons.filter(
    (c) =>
      c.isEligibleForQuantitativeStats &&
      c.coagEu !== null &&
      c.poEu !== null &&
      Number.isFinite(c.coagEu) &&
      Number.isFinite(c.poEu)
  );

  const n = valid.length;
  if (n < 2) return null;

  const diffs = valid.map((c) => c.coagEu! - c.poEu!);
  const means = valid.map((c) => (c.coagEu! + c.poEu!) / 2);

  const meanBias = mean(diffs);
  const sdBias = sd(diffs);

  if (!Number.isFinite(meanBias) || !Number.isFinite(sdBias)) return null;

  const seBias = sdBias / Math.sqrt(n);
  const tCrit = getStudentTCritical(n - 1);

  const biasCiLower = meanBias - tCrit * seBias;
  const biasCiUpper = meanBias + tCrit * seBias;

  const upperLoa = meanBias + 1.96 * sdBias;
  const lowerLoa = meanBias - 1.96 * sdBias;

  const seLoa = sdBias * Math.sqrt(1 / n + (1.96 * 1.96) / (2 * (n - 1)));
  const upperLoaCiLower = upperLoa - tCrit * seLoa;
  const upperLoaCiUpper = upperLoa + tCrit * seLoa;
  const lowerLoaCiLower = lowerLoa - tCrit * seLoa;
  const lowerLoaCiUpper = lowerLoa + tCrit * seLoa;

  let withinLoaCount = 0;
  const points: BlandAltmanPoint[] = valid.map((c, i) => {
    const diff = diffs[i];
    const m = means[i];
    const isOutlier = diff > upperLoa || diff < lowerLoa;
    if (!isOutlier) withinLoaCount++;

    return {
      sampleId: c.sampleId,
      name: c.name,
      mean: m,
      diff,
      absDiff: Math.abs(diff),
      rpd: c.rpd ?? 0,
      isLowConcentration: m < lowConcThresholdEu,
      isOutlier,
    };
  });

  const percentWithinLoa = n > 0 ? (withinLoaCount / n) * 100 : 0;

  // Diagnostics: Proportional bias (trend of differences vs means)
  let trendSlope = 0;
  let trendIntercept = 0;
  let trendR = 0;
  let trendPValue = 1.0;
  if (n >= 3) {
    const mMean = mean(means);
    const dMean = mean(diffs);
    let s_mm = 0;
    let s_dd = 0;
    let s_md = 0;
    for (let i = 0; i < n; i++) {
      const dm = means[i] - mMean;
      const dd = diffs[i] - dMean;
      s_mm += dm * dm;
      s_dd += dd * dd;
      s_md += dm * dd;
    }
    if (s_mm > 1e-12 && s_dd > 1e-12) {
      trendSlope = s_md / s_mm;
      trendIntercept = dMean - trendSlope * mMean;
      trendR = s_md / Math.sqrt(s_mm * s_dd);
      const dfTrend = n - 2;
      const tTrend =
        Math.abs(trendR) *
        Math.sqrt(dfTrend / Math.max(1e-9, 1 - trendR * trendR));
      trendPValue = studentTPValue(tTrend, dfTrend);
    }
  }
  const hasProportionalBiasWarning =
    Math.abs(trendR) >= 0.3 && trendPValue < 0.05;

  // Diagnostics: Heteroscedasticity (magnitude of difference vs mean)
  let heteroscedasticityR = 0;
  let heteroscedasticityPValue = 1.0;
  if (n >= 3) {
    const absDiffs = diffs.map((d) => Math.abs(d - meanBias));
    const mMean = mean(means);
    const adMean = mean(absDiffs);
    let s_mm = 0;
    let s_ad = 0;
    let s_mad = 0;
    for (let i = 0; i < n; i++) {
      const dm = means[i] - mMean;
      const dad = absDiffs[i] - adMean;
      s_mm += dm * dm;
      s_ad += dad * dad;
      s_mad += dm * dad;
    }
    if (s_mm > 1e-12 && s_ad > 1e-12) {
      heteroscedasticityR = s_mad / Math.sqrt(s_mm * s_ad);
      const dfHet = n - 2;
      const tHet =
        Math.abs(heteroscedasticityR) *
        Math.sqrt(dfHet / Math.max(1e-9, 1 - heteroscedasticityR * heteroscedasticityR));
      heteroscedasticityPValue = studentTPValue(tHet, dfHet);
    }
  }
  const hasHeteroscedasticityWarning =
    heteroscedasticityR >= 0.3 && heteroscedasticityPValue < 0.05;

  const smallSampleWarning = n < 20;

  let agreementAcceptable: boolean | null = null;
  if (
    allowableDifferenceMargin !== undefined &&
    allowableDifferenceMargin > 0
  ) {
    agreementAcceptable =
      lowerLoa >= -allowableDifferenceMargin &&
      upperLoa <= allowableDifferenceMargin;
  }

  const assumptionsNotice =
    'Bland-Altman analysis assumes Gaussian distribution of paired differences, homoscedasticity across concentrations, and mutually independent samples. "Percent within LoA" (~95% Gaussian expectation) is descriptive only and does not establish acceptable agreement.';

  return {
    n,
    meanBias,
    sdBias,
    seBias,
    biasCiLower,
    biasCiUpper,
    upperLoa,
    lowerLoa,
    seLoa,
    upperLoaCiLower,
    upperLoaCiUpper,
    lowerLoaCiLower,
    lowerLoaCiUpper,
    points,
    withinLoaCount,
    percentWithinLoa,
    trendSlope,
    trendIntercept,
    trendR,
    trendPValue,
    hasProportionalBiasWarning,
    heteroscedasticityR,
    heteroscedasticityPValue,
    hasHeteroscedasticityWarning,
    smallSampleWarning,
    allowableDifferenceMargin,
    agreementAcceptable,
    assumptionsNotice,
  };
}

/**
 * Helper to retrieve the slope at 1-based rank r in the Passing-Bablok rotated angular sequence.
 * In Passing & Bablok (1983), pairwise slopes are rotated such that the boundary is at angle -45° (slope -1).
 * Slopes S >= -1 are ordered first, followed by slopes S < -1.
 */
function getPassingBablokRotatedSlope(
  sortedSlopes: number[],
  r: number,
  K: number
): number {
  const N = sortedSlopes.length;
  let shiftedRank = r + K;
  if (shiftedRank > N) {
    shiftedRank -= N;
  }
  return sortedSlopes[shiftedRank - 1];
}

/**
 * Computes Classical Passing-Bablok non-parametric regression (Passing & Bablok 1983).
 * Explicitly implements:
 * 1. Correct shifted median handling for even and odd N.
 * 2. Proper treatment of tied x (dx = 0, vertical), tied y (dy = 0, horizontal), and identical points.
 * 3. Exact exclusion of S = -1 (perpendicular direction).
 * 4. Proper angular rotation for negative slopes (S < -1 count K).
 * 5. Kendall-like rank indexing for 95% Confidence Intervals.
 * 6. Linearity Cusum test.
 */
export function computePassingBablok(
  comparisons: AssayComparisonItem[]
): PassingBablokResult | null {
  const valid = comparisons.filter(
    (c) =>
      c.isEligibleForQuantitativeStats &&
      c.coagEu !== null &&
      c.poEu !== null &&
      Number.isFinite(c.coagEu) &&
      Number.isFinite(c.poEu)
  );

  const n = valid.length;
  if (n < 3) return null;

  const totalPairs = (n * (n - 1)) / 2;
  const slopes: number[] = [];
  let tiedXPairs = 0;
  let tiedYPairs = 0;
  let sMinusOnePairs = 0;
  let kCount = 0; // count of slopes strictly < -1

  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = valid[j].coagEu! - valid[i].coagEu!;
      const dy = valid[j].poEu! - valid[i].poEu!;

      // Disregard identical points
      if (Math.abs(dx) < 1e-12 && Math.abs(dy) < 1e-12) {
        continue;
      }

      if (Math.abs(dx) < 1e-12) {
        // Vertical line (angle 90° or slope +Infinity)
        tiedXPairs++;
        slopes.push(Infinity);
        continue;
      }

      if (Math.abs(dy) < 1e-12) {
        tiedYPairs++;
        slopes.push(0);
        continue;
      }

      const s = dy / dx;

      // Disregard slopes equal to -1 (perpendicular to identity)
      if (Math.abs(s - -1) < 1e-9) {
        sMinusOnePairs++;
        continue;
      }

      slopes.push(s);
      if (s < -1) {
        kCount++;
      }
    }
  }

  const validPairs = slopes.length;
  if (validPairs === 0) return null;

  // Sort slopes in standard ascending numerical order: S_(1) <= S_(2) <= ... <= S_(N)
  slopes.sort((a, b) => a - b);
  const N = validPairs;

  // Estimate median slope b via rotated angular median
  let slope: number;
  if (N % 2 === 1) {
    const m = (N + 1) / 2;
    slope = getPassingBablokRotatedSlope(slopes, m, kCount);
  } else {
    const m1 = N / 2;
    const m2 = N / 2 + 1;
    const s1 = getPassingBablokRotatedSlope(slopes, m1, kCount);
    const s2 = getPassingBablokRotatedSlope(slopes, m2, kCount);
    slope = (s1 + s2) / 2;
  }

  // If slope is infinite or non-finite, cannot compute valid linear relationship
  if (!Number.isFinite(slope)) return null;

  // 95% Confidence Interval for slope b (Kendall-type score variance)
  // sigma = sqrt( n*(n-1)*(2n+5) / 18 )
  const sigma = Math.sqrt((n * (n - 1) * (2 * n + 5)) / 18);
  const cAlpha = 1.95996398454 * sigma;

  let m1 = Math.round((N - cAlpha) / 2);
  if (m1 < 1) m1 = 1;
  let m2 = N + 1 - m1;
  if (m2 > N) m2 = N;

  const sCi1 = getPassingBablokRotatedSlope(slopes, m1, kCount);
  const sCi2 = getPassingBablokRotatedSlope(slopes, m2, kCount);
  const slopeCiLower = Math.min(sCi1, sCi2);
  const slopeCiUpper = Math.max(sCi1, sCi2);

  // Compute Intercept a = median(y_i - b * x_i)
  const computeMedianIntercept = (bVal: number): number => {
    const residuals = valid.map((p) => p.poEu! - bVal * p.coagEu!);
    residuals.sort((a, b) => a - b);
    const len = residuals.length;
    if (len % 2 === 1) {
      return residuals[Math.floor(len / 2)];
    }
    return (residuals[len / 2 - 1] + residuals[len / 2]) / 2;
  };

  const intercept = computeMedianIntercept(slope);
  const intFromUpperB = computeMedianIntercept(slopeCiUpper);
  const intFromLowerB = computeMedianIntercept(slopeCiLower);
  const interceptCiLower = Math.min(intFromUpperB, intFromLowerB);
  const interceptCiUpper = Math.max(intFromUpperB, intFromLowerB);

  const hasConstantBias = !(interceptCiLower <= 0 && interceptCiUpper >= 0);
  const hasProportionalBias = !(slopeCiLower <= 1.0 && slopeCiUpper >= 1.0);

  // Linearity Cusum Test (Passing & Bablok 1983)
  // Project points onto the fitted line: d_i = (x_i + b * y_i) / sqrt(1 + b^2)
  const normFactor = Math.sqrt(1 + slope * slope);
  const projected = valid.map((p) => {
    const x = p.coagEu!;
    const y = p.poEu!;
    const d = (x + slope * y) / normFactor;
    const res = y - (intercept + slope * x);
    let sign = 0;
    if (res > 1e-9) sign = 1;
    else if (res < -1e-9) sign = -1;
    return { d, sign };
  });

  projected.sort((a, b) => a.d - b.d);

  let cusum = 0;
  let maxCusum = 0;
  for (const item of projected) {
    cusum += item.sign;
    if (Math.abs(cusum) > maxCusum) {
      maxCusum = Math.abs(cusum);
    }
  }

  const cusumStat = maxCusum;
  // Critical value for alpha = 0.05 from Kolmogorov-Smirnov cumulative sum threshold: h = floor(1.358 * sqrt(n))
  const cusumCritical = Math.max(2, Math.floor(1.358 * Math.sqrt(n)));
  const isLinear = cusumStat <= cusumCritical;

  // Pearson correlation R & R^2 for descriptive reference
  const xMean = mean(valid.map((p) => p.coagEu!));
  const yMean = mean(valid.map((p) => p.poEu!));
  let sxx = 0;
  let syy = 0;
  let sxy = 0;

  valid.forEach((p) => {
    const dx = p.coagEu! - xMean;
    const dy = p.poEu! - yMean;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  });

  const denom = Math.sqrt(sxx * syy);
  const pearsonR = denom > 0 ? sxy / denom : 0;
  const r2 = pearsonR * pearsonR;

  const sign = intercept >= 0 ? '+' : '-';
  const equation = `y = ${slope.toFixed(3)}x ${sign} ${Math.abs(intercept).toFixed(3)}`;

  // Strict language hygiene: CI including 1 and 0 does NOT prove equivalence
  let interpretationNote = '';
  if (!hasProportionalBias && !hasConstantBias) {
    interpretationNote = `Slope 95% CI includes 1.00 [${slopeCiLower.toFixed(2)}–${slopeCiUpper.toFixed(2)}] and Intercept 95% CI includes 0.00 [${interceptCiLower.toFixed(3)}–${interceptCiUpper.toFixed(3)}]. The null hypothesis of no constant or proportional difference is not rejected at α = 0.05. Note: Failure to reject does not confirm method equivalence.`;
  } else if (hasProportionalBias && hasConstantBias) {
    interpretationNote = `Statistically significant proportional difference (Slope 95% CI: ${slopeCiLower.toFixed(2)}–${slopeCiUpper.toFixed(2)}) and constant offset (Intercept 95% CI: ${interceptCiLower.toFixed(3)}–${interceptCiUpper.toFixed(3)}) detected at α = 0.05.`;
  } else if (hasProportionalBias) {
    interpretationNote = `Statistically significant proportional difference detected (Slope 95% CI: ${slopeCiLower.toFixed(2)}–${slopeCiUpper.toFixed(2)}, excludes 1.00) at α = 0.05.`;
  } else {
    interpretationNote = `Statistically significant constant offset detected (Intercept 95% CI: ${interceptCiLower.toFixed(3)}–${interceptCiUpper.toFixed(3)}, excludes 0.00) at α = 0.05.`;
  }

  return {
    n,
    totalPairs,
    validPairs,
    tiedXPairs,
    tiedYPairs,
    sMinusOnePairs,
    kCount,
    slope,
    intercept,
    slopeCiLower,
    slopeCiUpper,
    interceptCiLower,
    interceptCiUpper,
    hasConstantBias,
    hasProportionalBias,
    cusumStat,
    cusumCritical,
    isLinear,
    pearsonR,
    r2,
    equation,
    interpretationNote,
  };
}

/**
 * Computes Deming regression with explicit error variance ratio lambda = Var(e_x) / Var(e_y).
 * Computes Jackknife standard errors and 95% confidence intervals (Linnet 1993, 1998; CLSI EP09-A3).
 */
export function computeDemingRegression(
  comparisons: AssayComparisonItem[],
  lambda: number = 1.0
): DemingResult | null {
  const valid = comparisons.filter(
    (c) =>
      c.isEligibleForQuantitativeStats &&
      c.coagEu !== null &&
      c.poEu !== null &&
      Number.isFinite(c.coagEu) &&
      Number.isFinite(c.poEu)
  );

  const n = valid.length;
  if (n < 3 || lambda <= 0) return null;

  const solveDeming = (pts: { x: number; y: number }[], lam: number) => {
    const len = pts.length;
    const xM = mean(pts.map((p) => p.x));
    const yM = mean(pts.map((p) => p.y));

    let sxx = 0;
    let syy = 0;
    let sxy = 0;
    for (const p of pts) {
      const dx = p.x - xM;
      const dy = p.y - yM;
      sxx += dx * dx;
      syy += dy * dy;
      sxy += dx * dy;
    }
    sxx /= len - 1;
    syy /= len - 1;
    sxy /= len - 1;

    if (Math.abs(sxy) < 1e-12) return null;

    const b =
      (syy - lam * sxx + Math.sqrt(Math.pow(syy - lam * sxx, 2) + 4 * lam * sxy * sxy)) /
      (2 * sxy);
    const a = yM - b * xM;

    const denom = Math.sqrt(sxx * syy);
    const r = denom > 0 ? sxy / denom : 0;
    return { slope: b, intercept: a, r2: r * r };
  };

  const points = valid.map((p) => ({ x: p.coagEu!, y: p.poEu! }));
  const overall = solveDeming(points, lambda);
  if (!overall) return null;

  // Jackknife leave-one-out standard errors for slope and intercept
  const jackSlopes: number[] = [];
  const jackIntercepts: number[] = [];

  for (let i = 0; i < n; i++) {
    const subset = points.filter((_, idx) => idx !== i);
    const res = solveDeming(subset, lambda);
    if (res) {
      const pseudoSlope = n * overall.slope - (n - 1) * res.slope;
      const pseudoIntercept = n * overall.intercept - (n - 1) * res.intercept;
      jackSlopes.push(pseudoSlope);
      jackIntercepts.push(pseudoIntercept);
    }
  }

  let slopeSe = 0;
  let interceptSe = 0;
  if (jackSlopes.length >= 2) {
    const meanPseudoSlope = mean(jackSlopes);
    const meanPseudoIntercept = mean(jackIntercepts);
    const varSlope =
      jackSlopes.reduce((acc, v) => acc + Math.pow(v - meanPseudoSlope, 2), 0) /
      (n * (n - 1));
    const varIntercept =
      jackIntercepts.reduce(
        (acc, v) => acc + Math.pow(v - meanPseudoIntercept, 2),
        0
      ) /
      (n * (n - 1));
    slopeSe = Math.sqrt(Math.max(0, varSlope));
    interceptSe = Math.sqrt(Math.max(0, varIntercept));
  }

  const tCrit = getStudentTCritical(n - 2);
  const slopeCiLower = overall.slope - tCrit * slopeSe;
  const slopeCiUpper = overall.slope + tCrit * slopeSe;
  const interceptCiLower = overall.intercept - tCrit * interceptSe;
  const interceptCiUpper = overall.intercept + tCrit * interceptSe;

  const hasConstantBias = !(interceptCiLower <= 0 && interceptCiUpper >= 0);
  const hasProportionalBias = !(slopeCiLower <= 1.0 && slopeCiUpper >= 1.0);

  const sign = overall.intercept >= 0 ? '+' : '-';
  const equation = `y = ${overall.slope.toFixed(3)}x ${sign} ${Math.abs(overall.intercept).toFixed(3)}`;
  const assumptionStatement = `Assumes known error variance ratio λ = Var(ε_x)/Var(ε_y) = ${lambda.toFixed(2)} (${
    lambda === 1.0
      ? 'equal error variances between assays'
      : 'study-specified error variance weighting'
  }).`;

  return {
    n,
    lambda,
    slope: overall.slope,
    intercept: overall.intercept,
    slopeSe,
    interceptSe,
    slopeCiLower,
    slopeCiUpper,
    interceptCiLower,
    interceptCiUpper,
    hasConstantBias,
    hasProportionalBias,
    equation,
    r2: overall.r2,
    assumptionStatement,
  };
}

/**
 * Synthesizes Method Comparison Agreement Summary for scientific and analytical reporting.
 * Completely neutral evidentiary tone:
 * - Removes arbitrary bias cutoffs (e.g. 0.005 EU/mL).
 * - Avoids forbidden promotional/definitive words ("virtually identical", "confirms no bias", "safe", "clinical concordance", "equivalent").
 * - Reports 95% CIs and neutral statistical inferences.
 */
export function computeAgreementSummary(
  comparisons: AssayComparisonItem[],
  allowableMargin?: number,
  exploratoryRpdTier1: number = 15.0,
  exploratoryRpdTier2: number = 25.0,
  lowConcCutoff: number = 0.05,
  demingLambda: number = 1.0
): AgreementAnalysisSummary | null {
  const ba = computeBlandAltman(comparisons, allowableMargin, lowConcCutoff);
  if (!ba) return null;

  const pb = computePassingBablok(comparisons);
  const deming = computeDemingRegression(comparisons, demingLambda);

  const eligible = comparisons.filter((c) => c.isEligibleForQuantitativeStats);
  const excluded = comparisons.filter((c) => !c.isEligibleForQuantitativeStats);
  const lowConcCount = eligible.filter((c) => c.isLowConcentration).length;

  const avgRpd =
    eligible.length > 0
      ? eligible.reduce((acc, c) => acc + (c.rpd ?? 0), 0) / eligible.length
      : 0;

  const avgAbsDiff =
    eligible.length > 0
      ? eligible.reduce((acc, c) => acc + (c.absDiff ?? 0), 0) / eligible.length
      : 0;

  // Mean bias evaluation relative to zero
  const biasSign = ba.meanBias >= 0 ? '+' : '';
  const biasIncludesZero = ba.biasCiLower <= 0 && ba.biasCiUpper >= 0;
  const biasText = biasIncludesZero
    ? `The 95% CI for mean bias includes zero, indicating no statistically significant average shift at α = 0.05.`
    : `Statistically significant average shift detected (95% CI excludes zero).`;

  let statement = `Method comparison between Coagulation (turbidimetric) and Phenoloxidase (kinetic) was performed on ${eligible.length} quantifiable sample(s) (${excluded.length} sample(s) excluded due to below-blank or out-of-range status). Estimated mean bias is ${biasSign}${ba.meanBias.toFixed(3)} EU/mL [95% CI: ${ba.biasCiLower.toFixed(3)} to ${ba.biasCiUpper.toFixed(3)} EU/mL]. ${biasText} The 95% Limits of Agreement (LoA) span from ${ba.lowerLoa.toFixed(3)} [95% CI: ${ba.lowerLoaCiLower.toFixed(3)} to ${ba.lowerLoaCiUpper.toFixed(3)}] to ${ba.upperLoa.toFixed(3)} [95% CI: ${ba.upperLoaCiLower.toFixed(3)} to ${ba.upperLoaCiUpper.toFixed(3)}] EU/mL. Quantified pairs exhibited an average absolute difference of ${avgAbsDiff.toFixed(4)} EU/mL and an average Relative Percent Difference (RPD) of ${avgRpd.toFixed(1)}%.`;

  if (allowableMargin !== undefined && allowableMargin > 0) {
    if (ba.agreementAcceptable) {
      statement += ` The 95% LoA intervals fall within the protocol-defined allowable difference margin of ±${allowableMargin.toFixed(3)} EU/mL.`;
    } else {
      statement += ` The 95% LoA intervals exceed the protocol-defined allowable difference margin of ±${allowableMargin.toFixed(3)} EU/mL.`;
    }
  }

  if (pb) {
    statement += ` Passing-Bablok non-parametric regression: Slope = ${pb.slope.toFixed(2)} [95% CI: ${pb.slopeCiLower.toFixed(2)}–${pb.slopeCiUpper.toFixed(2)}], Intercept = ${pb.intercept.toFixed(3)} [95% CI: ${pb.interceptCiLower.toFixed(3)}–${pb.interceptCiUpper.toFixed(3)}]. ${pb.interpretationNote} Linearity cusum test: ${pb.isLinear ? 'no significant non-linearity detected (p ≥ 0.05)' : 'significant deviation from linearity detected (p < 0.05)'}.`;
  }

  if (lowConcCount > 0) {
    statement += ` Note: ${lowConcCount} sample(s) have concentrations near baseline (< ${lowConcCutoff.toFixed(3)} EU/mL), where RPD is mathematically amplified by baseline division; absolute differences should be consulted alongside percentage metrics.`;
  }

  return {
    blandAltman: ba,
    passingBablok: pb || undefined,
    deming: deming || undefined,
    allowableMargin,
    exploratoryRpdTier1,
    exploratoryRpdTier2,
    lowConcentrationCutoff: lowConcCutoff,
    concordanceStatement: statement,
  };
}
