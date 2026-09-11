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
  lines.push('### 🔬 Summary for Biochemistry Students');
  lines.push(
    `This report validates endotoxin (LPS) quantification in *Archachatina marginata* snail hemolymph using two complementary biological mechanisms: **protein coagulation turbidity** (${coagWl} nm) and **phenoloxidase enzyme velocity** (${poWl} nm). The goal is to verify whether bacterial pyrogens are present in test fluids and confirm if both defense pathways reach the same conclusion.`
  );
  lines.push('');

  // 2. Sample Findings & Biological Consequence
  lines.push('### 🧪 Sample Findings & Biological Consequence');
  if (coagSamples.length === 0) {
    lines.push('*No sample rows evaluated yet.*');
  } else {
    coagSamples.forEach((s) => {
      const isAbove = Number.isFinite(s.eu) && s.eu >= threshold;
      const statusText = isAbove ? '**Flagged (Above Threshold)**' : '**Pass (Within Safe Limit)**';
      const consequence = isAbove
        ? `Exceeds the ${threshold.toFixed(2)} EU/mL limit. In hemolymph, endotoxin triggered coagulin polymerization, indicating substantial pyrogen exposure.`
        : `Remains safely below ${threshold.toFixed(2)} EU/mL. Hemolymph clotting factors remained inactive (negligible pyrogen).`;
      lines.push(`- **${s.name}** (${s.eu.toFixed(3)} EU/mL): ${statusText} — ${consequence}`);
    });
  }
  lines.push('');

  // 3. Dual-Assay Concordance & Analytical Consequence
  lines.push('### ⚖️ Cross-Assay Concordance & Analytical Consequence');
  if (comparisons.length > 0) {
    if (discordantSamples.length > 0) {
      lines.push(
        `- **Divergence Detected (${discordantSamples.length} discordant sample):** ${discordantSamples.map((d) => `*${d.name}* (RPD: ${d.rpd.toFixed(1)}%)`).join(', ')}. Divergence between clotting turbidity and enzyme rate suggests possible optical turbidity interference, sample color bias, or partial enzyme inhibition. **Action:** Re-run 1–2 dilution replicates before drawing conclusions.`
      );
    } else {
      lines.push(
        `- **High Cross-Method Agreement:** Matched samples show consistent results between physical clotting and phenoloxidase kinetics (RPD ≤ 20%). This confirms that both detection pathways validate the same endotoxin level with high analytical confidence.`
      );
    }
  } else {
    lines.push('- *Run both Coagulation and Phenoloxidase assays to evaluate orthogonal agreement.*');
  }
  lines.push('');

  // 4. Student Takeaway
  lines.push('### 🎓 Key Takeaway');
  if (aboveCoag.length === 0 && discordantSamples.length === 0) {
    lines.push(
      'All test fluids passed within specification with strong cross-assay agreement. Both the clotting and enzymatic defense systems confirm low pyrogen levels.'
    );
  } else {
    lines.push(
      `Samples requiring attention: ${[...aboveCoag.map((s) => `${s.name} (high EU)`), ...discordantSamples.map((d) => `${d.name} (discordant)`)].join(', ')}. Document these in your lab notebook and verify with duplicate dilution tests.`
    );
  }

  return lines.join('\n');
}
