import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { computeBlandAltman, computeDemingRegression } from './math';
import type { AssayComparisonItem } from '../types';

// Verification of the Deming and Bland-Altman engine against an independent Python
// implementation (research_scripts/verify_method_comparison.py) and SciPy ODR,
// using the synthetic benchmark in data/synthetic_verification_dataset.csv (n = 20).
function loadPairs(file: string) {
  const text = fs.readFileSync(path.resolve(process.cwd(), 'data', file), 'utf8');
  return text.trim().split(/\r?\n/).slice(1).map((l) => {
    const c = l.split(',');
    return { id: c[0], x: parseFloat(c[1]), y: parseFloat(c[2]) };
  });
}
const toItem = (p: { id: string; x: number; y: number }): AssayComparisonItem =>
  ({
    id: p.id, sampleId: p.id, runId: 'verify', name: p.id,
    coagEu: p.x, coagRawEu: p.x, coagAbs: 0, coagStatus: '', coagAnalyticalStatus: 'WITHIN_RANGE',
    poEu: p.y, poRawEu: p.y, poRate: 0, poStatus: '',
    isEligibleForQuantitativeStats: true, absDiff: Math.abs(p.x - p.y), rpd: null, ratio: null,
    isLowConcentration: false, agreement: 'AGREE', concordance: 'high', comment: '',
  }) as unknown as AssayComparisonItem;

describe('M. Engine verification on the synthetic benchmark (n = 20)', () => {
  const items = loadPairs('synthetic_verification_dataset.csv').map(toItem);

  it('Deming (lambda = 1) matches the independent reference', () => {
    const d = computeDemingRegression(items, 1)!;
    expect(d.n).toBe(20);
    expect(d.slope).toBeCloseTo(1.0635, 3);
    expect(d.intercept).toBeCloseTo(1.3988, 3);
    expect(d.slopeCiLower).toBeCloseTo(0.9813, 3);
    expect(d.slopeCiUpper).toBeCloseTo(1.1458, 3);
    expect(d.interceptCiLower).toBeCloseTo(-1.006, 3);
    expect(d.interceptCiUpper).toBeCloseTo(3.8035, 3);
  });

  it('Bland-Altman matches the independent reference', () => {
    const b = computeBlandAltman(items)!;
    expect(b.meanBias).toBeCloseTo(-2.8383, 3);
    expect(b.biasCiLower).toBeCloseTo(-3.8199, 3);
    expect(b.biasCiUpper).toBeCloseTo(-1.8567, 3);
    expect(b.sdBias).toBeCloseTo(2.0974, 3);
    expect(b.lowerLoa).toBeCloseTo(-6.9491, 3);
    expect(b.upperLoa).toBeCloseTo(1.2725, 3);
    expect(b.lowerLoaCiLower).toBeCloseTo(-8.6555, 3);
    expect(b.lowerLoaCiUpper).toBeCloseTo(-5.2428, 3);
    expect(b.upperLoaCiLower).toBeCloseTo(-0.4338, 3);
    expect(b.upperLoaCiUpper).toBeCloseTo(2.9789, 3);
    expect(b.trendSlope).toBeCloseTo(-0.061, 3);
    expect(b.trendR).toBeCloseTo(-0.2978, 3);
    expect(b.trendPValue).toBeCloseTo(0.2022, 3);
  });

  // Documented convention: lambda = Var(error in x) / Var(error in y). A larger lambda
  // means x is noisier, which makes the corrected slope LARGER (reference: 1.0566 at 0.5, 1.0702 at 2).
  it('Deming lambda convention matches the documentation (lambda = var_x / var_y)', () => {
    expect(computeDemingRegression(items, 0.5)!.slope).toBeCloseTo(1.0566, 3);
    expect(computeDemingRegression(items, 2)!.slope).toBeCloseTo(1.0702, 3);
  });
});
