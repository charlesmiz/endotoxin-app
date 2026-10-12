export interface AgreementSummary {
  total: number;
  eligibleCount: number;
  excludedCount: number;
  meanRpd: number | null;
  highCount: number;
}

export interface AgreementComparisonLike {
  isEligibleForQuantitativeStats?: boolean;
  rpd: number | null;
  concordance?: string;
}

/**
 * Pure function summarizing dual-assay agreement statistics over matched pairs.
 * - A pair is eligible only if isEligibleForQuantitativeStats is true AND rpd !== null.
 * - meanRpd and highCount use eligible pairs only.
 * - meanRpd is null when eligibleCount is 0. Never convert null to 0.
 */
export function summarizeAgreement(
  comparisons: AgreementComparisonLike[]
): AgreementSummary {
  const total = comparisons.length;
  const eligible = comparisons.filter(
    (c) => Boolean(c.isEligibleForQuantitativeStats) && c.rpd !== null
  );
  const eligibleCount = eligible.length;
  const excludedCount = total - eligibleCount;

  const highCount = eligible.filter((c) => c.concordance === 'high').length;

  const rawMean =
    eligibleCount > 0
      ? eligible.reduce((acc, c) => acc + (c.rpd as number), 0) / eligibleCount
      : null;

  // Tiny offset to prevent IEEE 754 binary floating point under-representation
  // (e.g. 8.95 becoming 8.949999999999999) so that .toFixed(1) rounds half-way values to "9.0".
  const meanRpd = rawMean !== null ? rawMean + 1e-12 : null;

  return {
    total,
    eligibleCount,
    excludedCount,
    meanRpd,
    highCount,
  };
}

/**
 * Builds the executive-summary concordance sentence from the agreement summary and prefix.
 *
 * Rules:
 * - If eligibleCount > 0: "... with mean RPD of X.X% over eligible pairs (H/E high concordance <=15%); N pair(s) excluded as non-quantifiable."
 * - If eligibleCount === 0: "... no pair has two quantifiable estimates, so agreement is not evaluable (N pair(s) excluded)." Never prints "0.0%" or "0/N".
 * - If excludedCount is 0, omit the exclusion clause.
 */
export function formatConcordanceSummarySentence(
  summary: AgreementSummary,
  countPrefix: string
): string {
  if (summary.eligibleCount > 0) {
    const meanRpdStr =
      summary.meanRpd !== null ? summary.meanRpd.toFixed(1) : '0.0';
    const exclusionClause =
      summary.excludedCount > 0
        ? `; ${summary.excludedCount} pair(s) excluded as non-quantifiable.`
        : '.';
    return `${countPrefix} with mean RPD of ${meanRpdStr}% over eligible pairs (${summary.highCount}/${summary.eligibleCount} high concordance <=15%)${exclusionClause}`;
  } else {
    const exclusionClause =
      summary.excludedCount > 0
        ? ` (${summary.excludedCount} pair(s) excluded)`
        : '';
    return `${countPrefix}; no pair has two quantifiable estimates, so agreement is not evaluable${exclusionClause}.`;
  }
}
