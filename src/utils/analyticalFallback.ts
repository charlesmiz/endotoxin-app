export interface AnalyticalSummaryInput {
  runLabel?: string;
  threshold?: number;
  wavelengths?: { coagulation?: number; phenoloxidase?: number };
  calibration?: {
    r2?: number;
    slope?: number;
    intercept?: number;
    points?: any[];
  } | null;
  coagSamples?: Array<{
    name: string;
    abs: number;
    eu: number;
    n?: number;
    cv?: number;
    status: string;
  }>;
  kineticModel?: {
    r2?: number;
    slope?: number;
    intercept?: number;
  } | null;
  kineticSamples?: Array<{
    name: string;
    rate: number;
    r2: number;
    estimatedEu?: number;
    activityLevel?: string;
  }>;
  comparisons?: Array<{
    name: string;
    coagEu: number;
    poEu: number;
    absDiff: number;
    rpd: number;
    ratio: number;
    concordance: string;
  }>;
}

export function generateAnalyticalInterpretation(data: AnalyticalSummaryInput): string {
  const threshold = data.threshold ?? 0.5;
  const coagWl = data.wavelengths?.coagulation ?? 540;
  const poWl = data.wavelengths?.phenoloxidase ?? 490;
  const coagSamples = Array.isArray(data.coagSamples) ? data.coagSamples : [];
  const comparisons = Array.isArray(data.comparisons) ? data.comparisons : [];

  const aboveCoag = coagSamples.filter(
    (s) => Number.isFinite(s.eu) && s.eu >= threshold
  );
  const discordantSamples = comparisons.filter(
    (c) => c.concordance === 'discordant' || (Number.isFinite(c.rpd) && c.rpd > 30)
  );
  const highConcordanceSamples = comparisons.filter(
    (c) => c.concordance === 'high' || (Number.isFinite(c.rpd) && c.rpd <= 15)
  );

  const lines: string[] = [];

  // 1. Summary: What this report means
  lines.push('### 🔬 Summary of Results');
  lines.push(
    `This analysis summarizes endotoxin quantification data for *Archachatina marginata* hemolymph assays using optical protein coagulation (${coagWl} nm) and phenoloxidase kinetics (${poWl} nm). Results are evaluated against the configured study decision threshold (${threshold.toFixed(2)} EU/mL).`
  );
  lines.push('');

  // 2. Sample Findings & Threshold Comparisons
  lines.push('### 🧪 Sample Findings & Threshold Comparisons');
  if (coagSamples.length === 0) {
    lines.push('*No sample rows evaluated yet.*');
  } else {
    coagSamples.forEach((s) => {
      const isAbove = Number.isFinite(s.eu) && s.eu >= threshold;
      const statusText = isAbove
        ? '**Above configured study threshold — investigate**'
        : '**Below configured study threshold**';
      const consequence = isAbove
        ? `Estimated concentration (${s.eu.toFixed(3)} EU/mL) exceeds the configured study decision threshold (${threshold.toFixed(2)} EU/mL); analytical follow-up recommended.`
        : `Estimated concentration (${s.eu.toFixed(3)} EU/mL) is within the configured study threshold (${threshold.toFixed(2)} EU/mL).`;
      lines.push(`- **${s.name}** (${s.eu.toFixed(3)} EU/mL): ${statusText} — ${consequence}`);
    });
  }
  lines.push('');

  // 3. Dual-Assay Concordance & Analytical Consequence
  lines.push('### ⚖️ Exploratory Method Comparison & Agreement');
  if (comparisons.length > 0) {
    if (discordantSamples.length > 0) {
      lines.push(
        `- **Analytical Divergence Observed (${discordantSamples.length} discordant sample(s)):** ${discordantSamples.map((d) => `*${d.name}* (RPD: ${d.rpd.toFixed(1)}%)`).join(', ')}. Differences between turbidimetric coagulation and kinetic velocity may reflect matrix background absorbance, non-parallel slopes, or localized reaction rates. Follow-up dilution re-testing is recommended.`
      );
    } else {
      lines.push(
        `- **Close Cross-Assay Agreement:** Matched samples demonstrate consistent estimates between physical coagulation and phenoloxidase kinetic pathways (RPD within protocol limits).`
      );
    }
  } else {
    lines.push('- *Run both Coagulation and Phenoloxidase assays to evaluate cross-assay comparison.*');
  }
  lines.push('');

  // 4. Student Takeaway
  lines.push('### 📋 Analysis Takeaway');
  if (aboveCoag.length === 0 && discordantSamples.length === 0) {
    lines.push(
      `All evaluated samples produced estimates below the configured study threshold (${threshold.toFixed(2)} EU/mL) with acceptable cross-assay concordance across matched pairs.`
    );
  } else {
    lines.push(
      `Analytical review advised for: ${[...aboveCoag.map((s) => `${s.name} (above threshold)`), ...discordantSamples.map((d) => `${d.name} (discordant)`)].join(', ')}. Verify findings with duplicate dilution testing.`
    );
  }

  return lines.join('\n');
}
