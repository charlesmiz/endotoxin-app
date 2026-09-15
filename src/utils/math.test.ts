import { describe, it, expect } from 'vitest';
import {
  mean,
  sd,
  parseReplicatesDetailed,
  parseReplicates,
  summarizeReplicates,
  logGamma,
  betaIncomplete,
  fDistributionPValue,
  linreg,
  computeAnovaTable,
  quadreg,
  invertQuadratic,
  evaluateModelDiagnostics,
  chooseModel,
  computeSampleEstimates,
  computeKineticRates,
  computeAssayComparison,
  computeBlandAltman,
  computePassingBablok,
  computeDemingRegression,
  computeAgreementSummary,
} from './math';
import { CalibrationModelFit, KineticSampleRow, AssayComparisonItem } from '../types';

describe('B. Data Validation & Replicates Handling', () => {
  it('parseReplicatesDetailed captures both valid numbers and invalid tokens', () => {
    const res = parseReplicatesDetailed('0.125, 0.130; bad_token  0.128 \t #err');
    expect(res.values).toEqual([0.125, 0.13, 0.128]);
    expect(res.invalidTokens).toEqual(['bad_token', '#err']);
  });

  it('parseReplicates returns valid numbers only', () => {
    expect(parseReplicates('0.5, 0.6, error')).toEqual([0.5, 0.6]);
  });

  it('summarizeReplicates preserves NaN for SD and CV when n < 2', () => {
    const single = summarizeReplicates(0.25, '0.25');
    expect(single.n).toBe(1);
    expect(single.mean).toBe(0.25);
    expect(Number.isNaN(single.sd)).toBe(true);
    expect(Number.isNaN(single.cv)).toBe(true);

    const empty = summarizeReplicates(NaN, '');
    expect(empty.n).toBe(0);
    expect(Number.isNaN(empty.sd)).toBe(true);
  });

  it('summarizeReplicates computes sample SD and CV correctly when n >= 2', () => {
    const summary = summarizeReplicates(0, '10, 20, 30');
    expect(summary.n).toBe(3);
    expect(summary.mean).toBe(20);
    expect(summary.sd).toBe(10);
    expect(summary.cv).toBe(50);
  });
});

describe('F. Special Math Benchmarks & ANOVA', () => {
  it('logGamma matches known mathematical constants', () => {
    expect(logGamma(1)).toBeCloseTo(0, 10);
    expect(logGamma(2)).toBeCloseTo(0, 10);
    expect(logGamma(3)).toBeCloseTo(Math.log(2), 10);
    expect(logGamma(4)).toBeCloseTo(Math.log(6), 10);
    expect(logGamma(0.5)).toBeCloseTo(Math.log(Math.sqrt(Math.PI)), 10);
    expect(Number.isNaN(logGamma(0))).toBe(true);
    expect(Number.isNaN(logGamma(-1))).toBe(true);
  });

  it('betaIncomplete handles edge values and known points', () => {
    expect(betaIncomplete(2, 2, 0)).toBe(0);
    expect(betaIncomplete(2, 2, 1)).toBe(1);
    expect(betaIncomplete(1, 1, 0.5)).toBeCloseTo(0.5, 8);
    // For a=2, b=1, I_x(2,1) = x^2
    expect(betaIncomplete(2, 1, 0.5)).toBeCloseTo(0.25, 8);
  });

  it('fDistributionPValue accurately reproduces standard statistical tables', () => {
    // F = 1.0, df1 = 1, df2 = 10 -> p ~= 0.34089
    expect(fDistributionPValue(1.0, 1, 10)).toBeCloseTo(0.34089, 3);
    // F = 4.9646, df1 = 1, df2 = 10 -> p ~= 0.05
    expect(fDistributionPValue(4.9646, 1, 10)).toBeCloseTo(0.05, 3);
    // F = 10.044, df1 = 1, df2 = 10 -> p ~= 0.01
    expect(fDistributionPValue(10.044, 1, 10)).toBeCloseTo(0.01, 3);
    // Edge cases
    expect(fDistributionPValue(0, 1, 10)).toBe(1.0);
    expect(Number.isNaN(fDistributionPValue(-1, 1, 10))).toBe(true);
  });

  it('computeAnovaTable does NOT force degrees of freedom to 1 when n=2', () => {
    const points: [number, number][] = [
      [0, 0.05],
      [1, 0.55],
    ];
    const lin = linreg(points);
    const anova = computeAnovaTable(points, lin);

    expect(anova.dfRes).toBe(0);
    expect(Number.isNaN(anova.msRes)).toBe(true);
    expect(Number.isNaN(anova.fStat)).toBe(true);
    expect(Number.isNaN(anova.pValue)).toBe(true);
    expect(anova.status).toBe('INSUFFICIENT_DF');
  });

  it('computeAnovaTable computes exact F and p-value when dfRes > 0', () => {
    const points: [number, number][] = [
      [0.0, 0.05],
      [0.1, 0.15],
      [0.2, 0.25],
      [0.5, 0.55],
      [1.0, 1.05],
    ];
    const lin = linreg(points);
    const anova = computeAnovaTable(points, lin);

    expect(anova.dfRes).toBe(3);
    expect(anova.dfReg).toBe(1);
    expect(anova.status).toBe('VALID');
    expect(anova.fStat).toBeGreaterThan(100);
    expect(anova.pValue).toBeLessThan(0.001);
  });
});

describe('E. Calibration Model Selection & Diagnostics', () => {
  it('quadreg computes exact coefficients for a parabolic curve', () => {
    // y = 2x^2 + 3x + 1
    const points: [number, number][] = [
      [0, 1],
      [1, 6],
      [2, 15],
      [3, 28],
    ];
    const q = quadreg(points);
    expect(q.a).toBeCloseTo(2, 6);
    expect(q.b).toBeCloseTo(3, 6);
    expect(q.c).toBeCloseTo(1, 6);
    expect(q.r2).toBeCloseTo(1.0, 6);
  });

  it('invertQuadratic handles near-zero A, roots in range, and noSolution', () => {
    // Near-zero A: linear fallback y = 2x + 1 => for y=5, x=2
    const linFallback = invertQuadratic({ a: 0, b: 2, c: 1 }, 5, 0, 10);
    expect(linFallback.noSolution).toBe(false);
    expect(linFallback.roots[0]).toBeCloseTo(2, 6);

    // Negative discriminant: y = x^2 + 10 => for y=1 => x^2 = -9 => disc < 0
    const noReal = invertQuadratic({ a: 1, b: 0, c: 10 }, 1, 0, 10);
    expect(noReal.noSolution).toBe(true);

    // Ambiguous: y = -(x-2)^2 + 4 = -x^2 + 4x => for y=3 => (x-2)^2 = 1 => x = 1 or 3
    const amb = invertQuadratic({ a: -1, b: 4, c: 0 }, 3, 0, 5);
    expect(amb.ambiguous).toBe(true);
    expect(amb.roots.length).toBe(2);
  });

  it('chooseModel rejects non-positive linear slope', () => {
    // Decreasing absorbance standard curve (invalid)
    const points: [number, number][] = [
      [0, 0.5],
      [0.5, 0.4],
      [1.0, 0.2],
    ];
    const fit = chooseModel(points, 'linear');
    expect(fit.isValidCalibration).toBe(false);
    expect(fit.validationErrors?.length).toBeGreaterThan(0);
  });

  it('chooseModel auto selects linear when curvature is not statistically significant', () => {
    // Linear with tiny random noise
    const points: [number, number][] = [
      [0.0, 0.05],
      [0.1, 0.15],
      [0.2, 0.25],
      [0.5, 0.55],
      [1.0, 1.05],
    ];
    const fit = chooseModel(points, 'auto');
    expect(fit.model).toBe('linear');
    expect(fit.diagnostics?.recommendation).toBe('linear');
  });
});

describe('A. Critical Calibration & Hierarchical Estimation', () => {
  const validCal: CalibrationModelFit = {
    type: 'linear',
    model: 'linear',
    requestedModel: 'linear',
    slope: 1.0,
    intercept: 0.05,
    r2: 0.999,
    points: [
      [0.0, 0.05],
      [0.1, 0.15],
      [0.5, 0.55],
      [1.0, 1.05],
    ],
    meta: [],
    xMin: 0.0,
    xMax: 1.0,
    isValidCalibration: true,
  };

  it('does NOT clamp slope to 0.000001 when slope <= 0; invalidates calibration', () => {
    const badCal: CalibrationModelFit = {
      ...validCal,
      slope: -0.05,
      isValidCalibration: false,
    };
    const results = computeSampleEstimates(badCal, [{ name: 'S1', abs: 0.2 }], 0.5);
    expect(results[0].analyticalStatus).toBe('INVALID_CALIBRATION');
    expect(Number.isNaN(results[0].rawEu)).toBe(true);
    expect(results[0].reportedEu).toBeNull();
  });

  it('flags negative/invalid absorbance as INVALID_INPUT', () => {
    const results = computeSampleEstimates(validCal, [{ name: 'Bad Abs', abs: -0.02 }], 0.5);
    expect(results[0].analyticalStatus).toBe('INVALID_INPUT');
    expect(results[0].invalidInput).toBe(true);
  });

  it('handles below-blank samples as BELOW_BLANK with reportedEu=null and < LOD text', () => {
    const results = computeSampleEstimates(validCal, [{ name: 'Water Blank', abs: 0.02 }], 0.5);
    expect(results[0].analyticalStatus).toBe('BELOW_BLANK');
    expect(results[0].reportedEu).toBeNull();
    expect(results[0].reportableText).toContain('< LOD');
    expect(results[0].compliance).toBe('PASS');
  });

  it('handles out-of-range samples and dilution factor workflow', () => {
    // Upper standard is 1.05 OD. Sample is 1.50 OD
    const results = computeSampleEstimates(
      validCal,
      [{ name: 'Concentrated', abs: 1.5, dilutionFactor: 10 }],
      0.5
    );
    expect(results[0].analyticalStatus).toBe('OUT_OF_RANGE');
    expect(results[0].reportedEu).toBeNull();
    expect(results[0].compliance).toBe('FLAGGED');
    expect(results[0].reportableText).toContain('Dilution Required');
  });

  it('accurately estimates within-range sample and applies user-passed threshold', () => {
    // abs = 0.25 -> (0.25 - 0.05) / 1.0 = 0.20 EU/mL
    // Under threshold 0.50 -> PASS
    const passRes = computeSampleEstimates(validCal, [{ name: 'S1', abs: 0.25 }], 0.50);
    expect(passRes[0].analyticalStatus).toBe('WITHIN_RANGE');
    expect(passRes[0].reportedEu).toBeCloseTo(0.20, 3);
    expect(passRes[0].compliance).toBe('PASS');

    // Under threshold 0.15 -> FLAGGED
    const flagRes = computeSampleEstimates(validCal, [{ name: 'S1', abs: 0.25 }], 0.15);
    expect(flagRes[0].compliance).toBe('FLAGGED');
  });

  it('applies dilution factor to reportedEu when within range', () => {
    // abs = 0.25 -> 0.20 EU/mL * 10x dilution = 2.0 EU/mL original concentration
    const res = computeSampleEstimates(
      validCal,
      [{ name: 'S1 Diluted', abs: 0.25, dilutionFactor: 10 }],
      0.50
    );
    expect(res[0].analyticalStatus).toBe('WITHIN_RANGE');
    expect(res[0].reportedEu).toBeCloseTo(0.20, 3);
    expect(res[0].originalConcentration).toBeCloseTo(2.0, 3);
    expect(res[0].compliance).toBe('FLAGGED'); // 2.0 > 0.50
  });
});

describe('D. Phenoloxidase Kinetics', () => {
  it('direct-rate mode does NOT invent R²=1, deltaAbs, or initial/final abs', () => {
    const rows: KineticSampleRow[] = [
      {
        id: 'k1',
        sampleId: 'S1',
        name: 'Direct Sample',
        type: 'sample',
        inputMode: 'direct_rate',
        directRate: '0.0055',
        readings: {},
      },
    ];
    const { results } = computeKineticRates([], rows, 0.5);
    expect(results[0].rateSource).toBe('direct_input');
    expect(results[0].rate).toBeCloseTo(0.0055, 4);
    expect(Number.isNaN(results[0].r2)).toBe(true);
    expect(Number.isNaN(results[0].deltaAbs)).toBe(true);
    expect(Number.isNaN(results[0].initialAbs)).toBe(true);
    expect(Number.isNaN(results[0].finalAbs)).toBe(true);
    expect(results[0].activityThresholdType).toBe('exploratory_reference');
  });

  it('time-series mode calculates linear rate and honors user-selected time interval', () => {
    const rows: KineticSampleRow[] = [
      {
        id: 'k2',
        sampleId: 'S2',
        name: 'Series Sample',
        type: 'sample',
        inputMode: 'series',
        readings: {
          0: '0.100',
          2: '0.120',
          4: '0.140',
          6: '0.160',
          8: '0.180',
        },
        linearRegionStart: 2,
        linearRegionEnd: 6,
      },
    ];
    const { results } = computeKineticRates([0, 2, 4, 6, 8], rows, 0.5);
    expect(results[0].rateSource).toBe('time_series_fit');
    expect(results[0].timePoints).toEqual([2, 4, 6]);
    expect(results[0].rate).toBeCloseTo(0.010, 4); // (0.160 - 0.120) / (6 - 2) = 0.010 OD/min
    expect(results[0].r2).toBeCloseTo(1.0, 4);
  });

  it('validates PO calibration slope > 0 and disables inverted estimation if non-positive', () => {
    const rows: KineticSampleRow[] = [
      {
        id: 'std1',
        sampleId: 'STD0',
        name: 'Std 0',
        type: 'standard',
        standardEu: '0',
        readings: { 0: '0.1', 5: '0.15' }, // rate = 0.01
      },
      {
        id: 'std2',
        sampleId: 'STD1',
        name: 'Std 1',
        type: 'standard',
        standardEu: '1',
        readings: { 0: '0.1', 5: '0.12' }, // rate = 0.004 (decreasing!)
      },
    ];
    const { model } = computeKineticRates([0, 5], rows, 0.5);
    expect(model).not.toBeNull();
    expect(model?.isValid).toBe(false);
    expect(model?.validationError).toContain('non-positive');
  });
});

describe('C. Cross-Assay Pairing & Agreement Analysis', () => {
  const coagResults = computeSampleEstimates(
    {
      type: 'linear',
      model: 'linear',
      requestedModel: 'linear',
      slope: 1.0,
      intercept: 0.05,
      r2: 0.999,
      points: [
        [0.0, 0.05],
        [1.0, 1.05],
      ],
      meta: [],
      xMin: 0.0,
      xMax: 1.0,
      isValidCalibration: true,
    },
    [
      { sampleId: 'S1', name: 'Sample 1', abs: 0.35 }, // eu = 0.30
      { sampleId: 'S2', name: 'Sample 2', abs: 0.01 }, // below blank
      { sampleId: 'S3', name: 'Sample 3', abs: 0.55 }, // eu = 0.50
    ],
    0.50,
    'Run 1'
  );

  const poResults: KineticSampleRow[] = [
    {
      id: 'k1',
      sampleId: 'S1',
      name: 'Sample 1 PO',
      type: 'sample',
      inputMode: 'direct_rate',
      directRate: '0.008',
      readings: {},
    },
    {
      id: 'k2',
      sampleId: 'S2',
      name: 'Sample 2 PO',
      type: 'sample',
      inputMode: 'direct_rate',
      directRate: '0.001',
      readings: {},
    },
    {
      id: 'k3',
      sampleId: 'S3',
      name: 'Sample 3 PO',
      type: 'sample',
      inputMode: 'direct_rate',
      directRate: '0.012',
      readings: {},
    },
    // Standards to give PO a valid calibration curve
    {
      id: 'std0',
      sampleId: 'STD0',
      name: 'Std 0',
      type: 'standard',
      standardEu: '0',
      inputMode: 'direct_rate',
      directRate: '0.002',
      readings: {},
    },
    {
      id: 'std1',
      sampleId: 'STD1',
      name: 'Std 1',
      type: 'standard',
      standardEu: '1',
      inputMode: 'direct_rate',
      directRate: '0.022',
      readings: {},
    },
  ];

  const { results: poComputed } = computeKineticRates([], poResults, 0.50, 'Run 1');

  it('pairs samples strictly by sampleId and excludes non-quantifiable samples', () => {
    const comparisons = computeAssayComparison(coagResults, poComputed, 20.0, 'Run 1');

    // S1: both within range -> eligible
    const s1 = comparisons.find((c) => c.sampleId === 'S1');
    expect(s1).toBeDefined();
    expect(s1?.isEligibleForQuantitativeStats).toBe(true);

    // S2: coag below blank -> excluded from quantitative statistics
    const s2 = comparisons.find((c) => c.sampleId === 'S2');
    expect(s2).toBeDefined();
    expect(s2?.isEligibleForQuantitativeStats).toBe(false);
    expect(s2?.agreement).toBe('EXCLUDED');
    expect(s2?.rpd).toBeNull();
  });

  it('Bland-Altman and Passing-Bablok run only on quantitatively eligible samples', () => {
    const comparisons = computeAssayComparison(coagResults, poComputed, 20.0, 'Run 1');
    const ba = computeBlandAltman(comparisons);
    expect(ba).toBeDefined();
    // Only S1 and S3 are eligible
    expect(ba?.n).toBe(2);
  });
});

const makeComparisonItems = (pairs: [number, number][]): AssayComparisonItem[] => {
  return pairs.map(([x, y], idx) => ({
    id: `item-${idx}`,
    sampleId: `S${idx + 1}`,
    runId: 'Run 1',
    name: `Sample ${idx + 1}`,
    coagEu: x,
    coagRawEu: x,
    coagAbs: x,
    coagStatus: 'VALID',
    coagAnalyticalStatus: 'WITHIN_RANGE',
    poEu: y,
    poRawEu: y,
    poRate: y,
    poStatus: 'VALID',
    poAnalyticalStatus: 'WITHIN_RANGE',
    rpd: x + y > 0 ? (Math.abs(x - y) / ((x + y) / 2)) * 100 : 0,
    absDiff: Math.abs(x - y),
    ratio: y > 0 ? x / y : 1,
    concordance: 'high',
    agreement: 'AGREE',
    comment: '',
    isEligibleForQuantitativeStats: true,
    isLowConcentration: Math.max(x, y) < 0.05,
  }));
};

describe('G. Passing–Bablok Classical Algorithm Benchmarks & Fixtures', () => {

  it('Fixture 1: Perfect Agreement (y = x) across Even N (n = 4)', () => {
    const items = makeComparisonItems([
      [0.1, 0.1],
      [0.2, 0.2],
      [0.4, 0.4],
      [0.8, 0.8],
    ]);
    const pb = computePassingBablok(items);
    expect(pb).not.toBeNull();
    expect(pb?.slope).toBeCloseTo(1.0, 5);
    expect(pb?.intercept).toBeCloseTo(0.0, 5);
    expect(pb?.hasProportionalBias).toBe(false);
    expect(pb?.hasConstantBias).toBe(false);
    expect(pb?.isLinear).toBe(true);
  });

  it('Fixture 2: Constant Offset (y = x + 0.15) across Odd N (n = 5)', () => {
    const items = makeComparisonItems([
      [0.1, 0.25],
      [0.2, 0.35],
      [0.3, 0.45],
      [0.5, 0.65],
      [0.8, 0.95],
    ]);
    const pb = computePassingBablok(items);
    expect(pb).not.toBeNull();
    expect(pb?.slope).toBeCloseTo(1.0, 5);
    expect(pb?.intercept).toBeCloseTo(0.15, 5);
    expect(pb?.hasProportionalBias).toBe(false);
    expect(pb?.hasConstantBias).toBe(true);
  });

  it('Fixture 3: Proportional Bias (y = 1.4x) across Even N (n = 6)', () => {
    const items = makeComparisonItems([
      [0.1, 0.14],
      [0.2, 0.28],
      [0.3, 0.42],
      [0.4, 0.56],
      [0.5, 0.70],
      [0.6, 0.84],
    ]);
    const pb = computePassingBablok(items);
    expect(pb).not.toBeNull();
    expect(pb?.slope).toBeCloseTo(1.4, 4);
    expect(pb?.intercept).toBeCloseTo(0.0, 4);
    expect(pb?.hasProportionalBias).toBe(true);
    expect(pb?.hasConstantBias).toBe(false);
  });

  it('Fixture 4: Handled tied x values (vertical pairwise slopes dx = 0)', () => {
    // Two samples share identical X=0.3
    const items = makeComparisonItems([
      [0.1, 0.1],
      [0.3, 0.32],
      [0.3, 0.28],
      [0.6, 0.61],
    ]);
    const pb = computePassingBablok(items);
    expect(pb).not.toBeNull();
    expect(pb?.tiedXPairs).toBeGreaterThan(0);
    // Classical Passing-Bablok treats vertical slopes as +infinity in ranking without throwing
    expect(Number.isFinite(pb?.slope)).toBe(true);
    expect(pb?.slope).toBeCloseTo(1.06, 2);
  });

  it('Fixture 5: Handled tied y values (horizontal pairwise slopes dy = 0)', () => {
    // Two samples share identical Y=0.3
    const items = makeComparisonItems([
      [0.1, 0.1],
      [0.29, 0.3],
      [0.31, 0.3],
      [0.6, 0.6],
    ]);
    const pb = computePassingBablok(items);
    expect(pb).not.toBeNull();
    expect(pb?.tiedYPairs).toBeGreaterThan(0);
    expect(Number.isFinite(pb?.slope)).toBe(true);
    expect(pb?.slope).toBeCloseTo(1.0, 1);
  });

  it('Fixture 6: Handled negative slopes and S = -1 exclusions', () => {
    // Pair 1 & Pair 2 has slope exactly -1.0: (0.7 - 0.8) / (0.3 - 0.2) = -0.1 / 0.1 = -1.0
    // Other pairs have negative slopes different from -1.0
    const items = makeComparisonItems([
      [0.1, 0.95],
      [0.2, 0.80],
      [0.3, 0.70],
      [0.6, 0.40],
      [0.9, 0.12],
    ]);
    const pb = computePassingBablok(items);
    expect(pb).not.toBeNull();
    expect(pb?.sMinusOnePairs).toBe(3); // S = -1 pairs successfully identified and excluded
    expect(pb?.slope).toBeLessThan(0); // Valid negative slope computed
    expect(Number.isFinite(pb?.slope)).toBe(true);
    expect(pb?.slope).toBeCloseTo(-1.5, 1);
  });

  it('Fixture 7: Near-zero dx (epsilon tolerance)', () => {
    // Extremely tiny dx = 1e-8
    const items = makeComparisonItems([
      [0.1, 0.1],
      [0.2, 0.2],
      [0.2 + 1e-8, 0.2 + 1e-8],
      [0.5, 0.5],
    ]);
    const pb = computePassingBablok(items);
    expect(pb).not.toBeNull();
    expect(Number.isFinite(pb?.slope)).toBe(true);
    expect(pb?.slope).toBeCloseTo(1.0, 2);
  });

  it('Fixture 8: Linearity Cusum Diagnostic correctly detects non-linear curvature', () => {
    // Strongly bowed parabolic curve: y = (x - 1.3)^2 over 25 points
    // Residuals from linear fit form a sustained streak on one side
    const points: [number, number][] = [];
    for (let i = 1; i <= 25; i++) {
      const x = i * 0.1;
      const y = (x - 1.3) * (x - 1.3);
      points.push([x, y]);
    }
    const items = makeComparisonItems(points);
    const pb = computePassingBablok(items);
    expect(pb).not.toBeNull();
    expect(pb?.cusumStat).toBeGreaterThan(pb!.cusumCritical);
    expect(pb?.isLinear).toBe(false); // detects significant deviation from linearity
  });
});

describe('H. Deming Orthogonal Regression Benchmarks & Assumptions', () => {
  it('Deming calculates orthogonal slope = 1.0, intercept = 0.0 for identity line with λ = 1', () => {
    const items = makeComparisonItems([
      [0.1, 0.1],
      [0.2, 0.2],
      [0.3, 0.3],
      [0.4, 0.4],
      [0.5, 0.5],
    ]);
    const deming = computeDemingRegression(items, 1.0);
    expect(deming).not.toBeNull();
    expect(deming?.slope).toBeCloseTo(1.0, 5);
    expect(deming?.intercept).toBeCloseTo(0.0, 5);
    expect(deming?.lambda).toBe(1.0);
    expect(deming?.assumptionStatement).toContain('equal error variance');
  });

  it('Deming supports custom lambda error variance ratio (e.g. λ = 2.0)', () => {
    const items = makeComparisonItems([
      [0.1, 0.12],
      [0.2, 0.22],
      [0.3, 0.28],
      [0.4, 0.43],
      [0.5, 0.49],
    ]);
    const demingL1 = computeDemingRegression(items, 1.0);
    const demingL2 = computeDemingRegression(items, 2.0);
    expect(demingL1).not.toBeNull();
    expect(demingL2).not.toBeNull();
    expect(demingL2?.lambda).toBe(2.0);
    // Different lambda shifts slope slightly
    expect(demingL1?.slope).not.toEqual(demingL2?.slope);
    expect(demingL2?.assumptionStatement).toContain('2.00');
  });

  it('Deming computes jackknife standard errors and 95% confidence intervals', () => {
    const items = makeComparisonItems([
      [0.10, 0.11],
      [0.20, 0.19],
      [0.30, 0.32],
      [0.40, 0.38],
      [0.50, 0.52],
    ]);
    const deming = computeDemingRegression(items, 1.0);
    expect(deming).not.toBeNull();
    expect(deming?.slopeSe).toBeGreaterThan(0);
    expect(deming?.interceptSe).toBeGreaterThan(0);
    expect(deming?.slopeCiLower).toBeLessThan(deming!.slope);
    expect(deming?.slopeCiUpper).toBeGreaterThan(deming!.slope);
  });
});

describe('I. Bland–Altman Confidence Intervals, Diagnostics, & Acceptance Criteria', () => {
  it('Bland-Altman computes 95% CIs for bias and LoA', () => {
    const items = makeComparisonItems([
      [0.10, 0.09],
      [0.20, 0.22],
      [0.30, 0.29],
      [0.40, 0.41],
      [0.50, 0.48],
    ]);
    const ba = computeBlandAltman(items);
    expect(ba).not.toBeNull();
    expect(ba?.biasCiLower).toBeLessThan(ba!.meanBias);
    expect(ba?.biasCiUpper).toBeGreaterThan(ba!.meanBias);
    expect(ba?.lowerLoaCiLower).toBeLessThan(ba!.lowerLoa);
    expect(ba?.upperLoaCiUpper).toBeGreaterThan(ba!.upperLoa);
  });

  it('Bland-Altman flags smallSampleWarning when n < 20', () => {
    const items = makeComparisonItems([
      [0.10, 0.10],
      [0.20, 0.20],
      [0.30, 0.30],
      [0.40, 0.40],
    ]);
    const ba = computeBlandAltman(items);
    expect(ba?.smallSampleWarning).toBe(true);
  });

  it('Bland-Altman detects proportional bias trend in differences', () => {
    // Differences increase dramatically with concentration: diff = 0.5 * mean
    const items = makeComparisonItems([
      [0.10, 0.05], // mean 0.075, diff 0.05
      [0.20, 0.10], // mean 0.150, diff 0.10
      [0.40, 0.20], // mean 0.300, diff 0.20
      [0.60, 0.30], // mean 0.450, diff 0.30
      [0.80, 0.40], // mean 0.600, diff 0.40
      [1.00, 0.50], // mean 0.750, diff 0.50
    ]);
    const ba = computeBlandAltman(items);
    expect(ba?.hasProportionalBiasWarning).toBe(true);
    expect(ba?.trendSlope).toBeGreaterThan(0.3);
    expect(ba?.trendPValue).toBeLessThan(0.05);
  });

  it('Bland-Altman detects heteroscedasticity (expanding variance with concentration)', () => {
    // Constant mean bias ~ 0, but variance explodes at higher concentration
    const items = makeComparisonItems([
      [0.10, 0.101],
      [0.12, 0.119],
      [0.14, 0.141],
      [0.50, 0.420], // diff -0.08
      [0.60, 0.710], // diff +0.11
      [0.70, 0.550], // diff -0.15
      [0.80, 0.990], // diff +0.19
    ]);
    const ba = computeBlandAltman(items);
    expect(ba?.hasHeteroscedasticityWarning).toBe(true);
    expect(ba?.heteroscedasticityPValue).toBeLessThan(0.05);
  });

  it('Bland-Altman evaluates allowable difference margin acceptance', () => {
    const items = makeComparisonItems([
      [0.10, 0.11],
      [0.20, 0.21],
      [0.30, 0.31],
      [0.40, 0.41],
    ]);
    // Allowable margin = 0.05 EU/mL -> LoA is within ~ [-0.012, -0.008]
    const baNarrow = computeBlandAltman(items, 0.05);
    expect(baNarrow?.agreementAcceptable).toBe(true);

    // Ultra-strict margin = 0.005 EU/mL -> LoA exceeds margin
    const baStrict = computeBlandAltman(items, 0.005);
    expect(baStrict?.agreementAcceptable).toBe(false);
  });
});

describe('J. Tone & Language Neutrality Constraints', () => {
  it('Summary synthesis and notes strictly exclude forbidden buzzwords', () => {
    const forbiddenWords = [
      'virtually identical',
      'confirms no bias',
      'safe',
      'clinical concordance',
      'equivalent',
    ];

    const pairs: [number, number][] = [
      [0.1, 0.1],
      [0.2, 0.2],
      [0.3, 0.3],
      [0.4, 0.4],
      [0.5, 0.5],
    ];

    const items = makeComparisonItems(pairs);

    const summary = computeAgreementSummary(items, 0.05);
    expect(summary).not.toBeNull();

    const fullText = (
      (summary?.concordanceStatement ?? '') +
      ' ' +
      (summary?.passingBablok?.interpretationNote ?? '') +
      ' ' +
      (summary?.deming?.assumptionStatement ?? '')
    ).toLowerCase();

    for (const word of forbiddenWords) {
      expect(fullText).not.toContain(word.toLowerCase());
    }
  });
});

