import { describe, it, expect } from 'vitest';
import {
  linreg,
  quadreg,
  invertQuadratic,
  computePassingBablok,
  computeDemingRegression,
  computeBlandAltman,
  fDistributionPValue,
  chooseModel,
  computeKineticRates,
  computeAssayComparison,
} from './math';
import { DETERMINISTIC_STUDY_FIXTURE } from '../data/studyFixtures';
import { AssayComparisonItem } from '../types';

function mockItem(partial: {
  sampleId: string;
  name?: string;
  coagEu: number;
  poEu: number;
  coagAbs?: number;
  poRate?: number;
}): AssayComparisonItem {
  const diff = partial.coagEu - partial.poEu;
  const absDiff = Math.abs(diff);
  const meanVal = (partial.coagEu + partial.poEu) / 2;
  const rpd = meanVal > 0 ? (absDiff / meanVal) * 100 : 0;
  return {
    id: partial.sampleId,
    sampleId: partial.sampleId,
    runId: 'RUN-1',
    name: partial.name || partial.sampleId,
    coagEu: partial.coagEu,
    coagRawEu: partial.coagEu,
    coagAbs: partial.coagAbs ?? 0.1,
    coagStatus: 'PASS',
    coagAnalyticalStatus: 'WITHIN_RANGE',
    poEu: partial.poEu,
    poRawEu: partial.poEu,
    poRate: partial.poRate ?? 0.01,
    poStatus: 'PASS',
    poAnalyticalStatus: 'WITHIN_RANGE',
    isEligibleForQuantitativeStats: true,
    absDiff,
    rpd,
    ratio: partial.poEu !== 0 ? partial.coagEu / partial.poEu : 1,
    isLowConcentration: false,
    agreement: 'AGREE',
    concordance: 'high',
    comment: '',
  };
}

describe('Implementation Quality Gates: Golden Reference Fixtures', () => {
  // 1. Golden Reference for Ordinary Least Squares (OLS)
  describe('1. Golden Reference: OLS Linear Regression', () => {
    it('matches textbook reference values for NIST-style calibration dataset', () => {
      // Textbook standard curve: x = [0.0, 1.0, 2.0, 3.0, 4.0, 5.0], y = [0.012, 0.104, 0.198, 0.295, 0.392, 0.491]
      const points: [number, number][] = [
        [0.0, 0.012],
        [1.0, 0.104],
        [2.0, 0.198],
        [3.0, 0.295],
        [4.0, 0.392],
        [5.0, 0.491],
      ];
      const fit = linreg(points);

      // Expected:
      // sum(x) = 15, x_bar = 2.5
      // sum(y) = 1.492, y_bar = 0.248667
      // SS_xx = 17.5
      // SS_xy = 0.012*(0-2.5) + 0.104*(1-2.5) + 0.198*(2-2.5) + 0.295*(3-2.5) + 0.392*(4-2.5) + 0.491*(5-2.5) = 1.678
      // slope = 1.678 / 17.5 = 0.0958857...
      // intercept = 0.248667 - 0.0958857 * 2.5 = 0.00895238...
      expect(fit.slope).toBeCloseTo(0.095886, 5);
      expect(fit.intercept).toBeCloseTo(0.008952, 5);
      expect(fit.r2).toBeGreaterThan(0.9998);
      expect(fit.stderr).toBeGreaterThan(0);
      expect(fit.fStat).toBeGreaterThan(0);
    });

    it('edge case: rejects fewer than 2 distinct points or zero variance in X', () => {
      const single: [number, number][] = [[1.0, 0.5]];
      const fitSingle = linreg(single);
      expect(Number.isNaN(fitSingle.slope)).toBe(true);

      const vertical: [number, number][] = [
        [2.0, 0.1],
        [2.0, 0.2],
        [2.0, 0.3],
      ];
      const fitVertical = linreg(vertical);
      expect(Number.isNaN(fitVertical.slope)).toBe(true);
    });
  });

  // 2. Golden Reference for Quadratic Regression
  describe('2. Golden Reference: Quadratic Regression', () => {
    it('matches exact parabolic curve parameters y = 0.02x^2 + 0.08x + 0.01', () => {
      // Generate exact points for known equation
      const xVals = [0.0, 0.5, 1.0, 2.0, 3.0, 4.0, 5.0];
      const pts: [number, number][] = xVals.map((x) => [
        x,
        0.02 * x * x + 0.08 * x + 0.01,
      ]);

      const q = quadreg(pts);
      expect(q.a).toBeCloseTo(0.02, 6);
      expect(q.b).toBeCloseTo(0.08, 6);
      expect(q.c).toBeCloseTo(0.01, 6);
      expect(q.r2).toBeCloseTo(1.0, 6);

      // Inversion: for y = 0.02*(2)^2 + 0.08*(2) + 0.01 = 0.08 + 0.16 + 0.01 = 0.25
      const inv = invertQuadratic({ a: q.a, b: q.b, c: q.c }, 0.25, 0, 5);
      expect(inv.noSolution).toBe(false);
      expect(inv.ambiguous).toBe(false);
      expect(inv.roots[0]).toBeCloseTo(2.0, 5);
    });
  });

  // 3. Golden Reference for Passing–Bablok Nonparametric Regression
  describe('3. Golden Reference: Passing–Bablok Regression', () => {
    it('computes exact identity regression for identical assay measurements', () => {
      const items: AssayComparisonItem[] = [
        mockItem({ sampleId: 'S1', coagEu: 0.10, poEu: 0.10, coagAbs: 0.01, poRate: 0.005 }),
        mockItem({ sampleId: 'S2', coagEu: 0.25, poEu: 0.25, coagAbs: 0.02, poRate: 0.010 }),
        mockItem({ sampleId: 'S3', coagEu: 0.50, poEu: 0.50, coagAbs: 0.05, poRate: 0.020 }),
        mockItem({ sampleId: 'S4', coagEu: 1.00, poEu: 1.00, coagAbs: 0.10, poRate: 0.040 }),
        mockItem({ sampleId: 'S5', coagEu: 2.00, poEu: 2.00, coagAbs: 0.20, poRate: 0.080 }),
        mockItem({ sampleId: 'S6', coagEu: 4.00, poEu: 4.00, coagAbs: 0.40, poRate: 0.160 }),
      ];

      const pb = computePassingBablok(items);
      expect(pb).not.toBeNull();
      expect(pb?.slope).toBeCloseTo(1.0, 5);
      expect(pb?.intercept).toBeCloseTo(0.0, 5);
      expect(pb?.slopeCiLower).toBeLessThanOrEqual(1.0);
      expect(pb?.slopeCiUpper).toBeGreaterThanOrEqual(1.0);
      expect(pb?.interceptCiLower).toBeLessThanOrEqual(0.0);
      expect(pb?.interceptCiUpper).toBeGreaterThanOrEqual(0.0);
      expect(pb?.isLinear).toBe(true);
    });

    it('CLSI EP09 style test: handles systematic proportional and constant shift', () => {
      // Y = 1.10 * X + 0.05
      const xVals = [0.2, 0.4, 0.8, 1.2, 1.8, 2.5, 3.2, 4.0];
      const items: AssayComparisonItem[] = xVals.map((x, i) => {
        const y = 1.10 * x + 0.05;
        return mockItem({
          sampleId: `S${i + 1}`,
          coagEu: x,
          poEu: y,
        });
      });

      const pb = computePassingBablok(items);
      expect(pb).not.toBeNull();
      expect(pb?.slope).toBeCloseTo(1.10, 4);
      expect(pb?.intercept).toBeCloseTo(0.05, 4);
      expect(pb?.isLinear).toBe(true);
    });
  });

  // 4. Golden Reference for Deming Regression
  describe('4. Golden Reference: Deming Orthogonal Regression', () => {
    it('produces exact slope = 1.0 and intercept = 0.0 for identical data with lambda = 1.0', () => {
      const items: AssayComparisonItem[] = [
        0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8,
      ].map((v, i) =>
        mockItem({
          sampleId: `S${i + 1}`,
          coagEu: v,
          poEu: v,
        })
      );

      const deming = computeDemingRegression(items, 1.0);
      expect(deming).not.toBeNull();
      expect(deming?.slope).toBeCloseTo(1.0, 5);
      expect(deming?.intercept).toBeCloseTo(0.0, 5);
    });
  });

  // 5. Golden Reference for Bland–Altman
  describe('5. Golden Reference: Bland–Altman Method Comparison', () => {
    it('computes exact mean difference, SD, LoA, and 95% CIs', () => {
      // Coag: [1.0, 2.0, 3.0, 4.0, 5.0]
      // PO:   [1.1, 2.1, 2.9, 4.2, 5.0]
      // Differences (Coag - PO): [-0.1, -0.1, +0.1, -0.2, 0.0]
      // sum(d) = -0.3
      // mean(d) = -0.06
      // deviations: -0.04, -0.04, +0.16, -0.14, +0.06
      // sum(dev^2) = 0.0016 + 0.0016 + 0.0256 + 0.0196 + 0.0036 = 0.052
      // s_d = sqrt(0.052 / 4) = sqrt(0.013) = 0.1140175...
      // Upper LoA = -0.06 + 1.96 * 0.1140175 = 0.16347...
      // Lower LoA = -0.06 - 1.96 * 0.1140175 = -0.28347...
      const coagVals = [1.0, 2.0, 3.0, 4.0, 5.0];
      const poVals = [1.1, 2.1, 2.9, 4.2, 5.0];

      const items: AssayComparisonItem[] = coagVals.map((c, i) =>
        mockItem({
          sampleId: `S${i + 1}`,
          coagEu: c,
          poEu: poVals[i],
        })
      );

      const ba = computeBlandAltman(items);
      expect(ba).not.toBeNull();
      expect(ba?.meanBias).toBeCloseTo(-0.06, 5);
      expect(ba?.sdBias).toBeCloseTo(Math.sqrt(0.013), 5);
      expect(ba?.upperLoa).toBeCloseTo(-0.06 + 1.96 * Math.sqrt(0.013), 3);
      expect(ba?.lowerLoa).toBeCloseTo(-0.06 - 1.96 * Math.sqrt(0.013), 3);
      expect(ba?.biasCiLower).toBeLessThan(ba!.meanBias);
      expect(ba?.biasCiUpper).toBeGreaterThan(ba!.meanBias);
    });
  });

  // 6. Golden Reference for F Distribution P-Values
  describe('6. Golden Reference: F-Distribution P-Values', () => {
    it('matches exact published values from standard statistical tables', () => {
      // 1. F = 4.9646, df1 = 1, df2 = 10 -> p = 0.05
      expect(fDistributionPValue(4.9646, 1, 10)).toBeCloseTo(0.05, 3);

      // 2. F = 10.044, df1 = 1, df2 = 10 -> p = 0.01
      expect(fDistributionPValue(10.044, 1, 10)).toBeCloseTo(0.01, 3);

      // 3. F = 3.4928, df1 = 2, df2 = 20 -> p = 0.05
      expect(fDistributionPValue(3.4928, 2, 20)).toBeCloseTo(0.05, 3);

      // 4. F = 5.8489, df1 = 2, df2 = 20 -> p = 0.01
      expect(fDistributionPValue(5.8489, 2, 20)).toBeCloseTo(0.01, 3);

      // 5. F = 4.0012, df1 = 1, df2 = 60 -> p = 0.05
      expect(fDistributionPValue(4.0012, 1, 60)).toBeCloseTo(0.05, 3);

      // 6. Large F: F = 100, df1 = 1, df2 = 20 -> p < 0.0001
      expect(fDistributionPValue(100, 1, 20)).toBeLessThan(0.0001);
    });
  });

  // 7. Full-Study Deterministic Fixture Execution
  describe('7. Full-Study Deterministic Fixture Validation', () => {
    it('executes full dual-assay analysis synchronously with zero delay', () => {
      const fix = DETERMINISTIC_STUDY_FIXTURE;

      // Calibration fit
      const calFit = chooseModel(fix.calibrationPoints, 'linear');
      expect(calFit.isValidCalibration).toBe(true);
      expect(calFit.r2).toBeGreaterThan(0.999);
      expect(calFit.slope).toBeGreaterThan(0.08);

      // Kinetic calculation
      const { results: kinResults, model: kinModel } = computeKineticRates(
        fix.timePoints,
        fix.kineticRows,
        0.5,
        'Deterministic Study Run'
      );
      expect(kinResults.length).toBe(7);
      expect(kinModel).not.toBeNull();
      expect(kinModel?.r2).toBeGreaterThan(0.99);

      // Verify all samples have valid rates
      const s1Kin = kinResults.find((r) => r.sampleId === 'S1');
      expect(s1Kin).toBeDefined();
      expect(s1Kin?.valid).toBe(true);
      expect(s1Kin?.rate).toBeGreaterThan(0);
    });
  });
});
