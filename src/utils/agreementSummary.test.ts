import { describe, it, expect } from 'vitest';
import {
  summarizeAgreement,
  formatConcordanceSummarySentence,
  type AgreementComparisonLike,
} from './agreementSummary';

describe('Dual-Assay Agreement Summary', () => {
  it('(a) comparisons with RPD 5.7 (eligible), one excluded pair (rpd null, not eligible), and RPD 12.2 (eligible) give eligibleCount 2, excludedCount 1, highCount 2 and meanRpd close to 8.95; the formatted value with toFixed(1) is "9.0"', () => {
    const comparisons: AgreementComparisonLike[] = [
      {
        isEligibleForQuantitativeStats: true,
        rpd: 5.7,
        concordance: 'high',
      },
      {
        isEligibleForQuantitativeStats: false,
        rpd: null,
        concordance: 'not_evaluable',
      },
      {
        isEligibleForQuantitativeStats: true,
        rpd: 12.2,
        concordance: 'high',
      },
    ];

    const summary = summarizeAgreement(comparisons);

    expect(summary.total).toBe(3);
    expect(summary.eligibleCount).toBe(2);
    expect(summary.excludedCount).toBe(1);
    expect(summary.highCount).toBe(2);
    expect(summary.meanRpd).not.toBeNull();
    expect(summary.meanRpd!).toBeCloseTo(8.95, 2);
    expect(summary.meanRpd!.toFixed(1)).toBe('9.0');
  });

  it('(b) zero eligible pairs give meanRpd null, and the summary text contains "not evaluable" and does NOT contain "0.0%"', () => {
    const comparisons: AgreementComparisonLike[] = [
      {
        isEligibleForQuantitativeStats: false,
        rpd: null,
        concordance: 'not_evaluable',
      },
      {
        isEligibleForQuantitativeStats: false,
        rpd: null,
        concordance: 'not_evaluable',
      },
    ];

    const summary = summarizeAgreement(comparisons);

    expect(summary.eligibleCount).toBe(0);
    expect(summary.excludedCount).toBe(2);
    expect(summary.meanRpd).toBeNull();

    const prefix = 'Dual-Assay Concordance: 2 sample(s) cross-compared';
    const summaryText = formatConcordanceSummarySentence(summary, prefix);

    expect(summaryText).toContain('not evaluable');
    expect(summaryText).not.toContain('0.0%');
    expect(summaryText).toContain('2 pair(s) excluded');
  });

  it('(c) all pairs eligible gives no exclusion clause', () => {
    const comparisons: AgreementComparisonLike[] = [
      {
        isEligibleForQuantitativeStats: true,
        rpd: 5.7,
        concordance: 'high',
      },
      {
        isEligibleForQuantitativeStats: true,
        rpd: 12.2,
        concordance: 'high',
      },
    ];

    const summary = summarizeAgreement(comparisons);

    expect(summary.eligibleCount).toBe(2);
    expect(summary.excludedCount).toBe(0);

    const prefix = 'Dual-Assay Concordance: 2 sample(s) cross-compared';
    const summaryText = formatConcordanceSummarySentence(summary, prefix);

    expect(summaryText).not.toContain('excluded');
    expect(summaryText).toContain('with mean RPD of 9.0% over eligible pairs (2/2 high concordance <=15%).');
  });

  it('(d) the executive summary and the section-4 card show identical values for case (a)', () => {
    const comparisons: AgreementComparisonLike[] = [
      {
        isEligibleForQuantitativeStats: true,
        rpd: 5.7,
        concordance: 'high',
      },
      {
        isEligibleForQuantitativeStats: false,
        rpd: null,
        concordance: 'not_evaluable',
      },
      {
        isEligibleForQuantitativeStats: true,
        rpd: 12.2,
        concordance: 'high',
      },
    ];

    const summary = summarizeAgreement(comparisons);

    // Section 4 card values
    const cardMeanRpdDisplay =
      summary.meanRpd !== null ? `${summary.meanRpd.toFixed(1)}%` : '—';
    const cardTier1Fraction = `${summary.highCount}/${summary.eligibleCount}`;

    // Executive summary sentence
    const prefix =
      'Dual-Assay Concordance: 3 unique sample(s) evaluated (3 matched pair(s), 0 coag-only, 0 PO-only)';
    const executiveSummaryText = formatConcordanceSummarySentence(summary, prefix);

    // Both show identical values (mean RPD: "9.0%", Tier 1 / high concordance: 2/2)
    expect(cardMeanRpdDisplay).toBe('9.0%');
    expect(executiveSummaryText).toContain(`mean RPD of ${cardMeanRpdDisplay}`);
    expect(executiveSummaryText).toContain(`(${cardTier1Fraction} high concordance <=15%)`);
    expect(executiveSummaryText).toContain('1 pair(s) excluded as non-quantifiable.');
  });
});
