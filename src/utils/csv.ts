import { SampleRow, SampleEstimateResult, CalibrationModelFit, KineticResult, KineticCalibrationModel, AssayComparisonItem } from '../types';

/**
 * RFC 4180-compliant CSV Parser.
 * Correctly handles:
 * - Quoted fields containing commas: "Sample A, Batch 102",0.082
 * - Escaped double quotes: "Infusion ""Special"" Batch",0.082
 * - Embedded newlines inside quoted fields
 * - Windows (CRLF) and Unix (LF) line breaks
 * - Trailing whitespace and empty lines
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  const len = text.length;
  let i = 0;

  while (i < len) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        // Look ahead for escaped quote ("")
        if (i + 1 < len && text[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ',' || char === '\t') {
        // Field delimiter (supports comma or tab)
        currentRow.push(currentField.trim());
        currentField = '';
        i++;
        continue;
      } else if (char === '\r') {
        // Carriage return: check if next is \n
        if (i + 1 < len && text[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        if (currentRow.some((field) => field.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some((field) => field.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  // Final field and row if any remains
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((field) => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Format a single CSV cell according to RFC 4180 rules.
 * Escapes quotes and wraps cell in double quotes if it contains commas, quotes, or newlines.
 */
export function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return '';
    return val.toString();
  }
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Parse pasted or imported text into SampleRow array.
 * Detects headers and securely maps columns without splitting on commas within quotes.
 */
export function parseSampleCsvImport(rawText: string, currentLength: number = 0): SampleRow[] {
  const parsedGrid = parseCsv(rawText);
  if (parsedGrid.length === 0) return [];

  const rows: SampleRow[] = [];
  let startIndex = 0;

  // Check if first line is a header
  const firstRowStr = parsedGrid[0].join(' ').toLowerCase();
  if (
    firstRowStr.includes('sample') ||
    firstRowStr.includes('name') ||
    firstRowStr.includes('abs') ||
    firstRowStr.includes('absorbance') ||
    firstRowStr.includes('od')
  ) {
    startIndex = 1;
  }

  for (let r = startIndex; r < parsedGrid.length; r++) {
    const cols = parsedGrid[r];
    if (!cols || cols.length === 0 || cols.every((c) => !c.trim())) continue;

    let sampleId = `S${currentLength + rows.length + 1}`;
    let name = '';
    let abs = '';
    let replicates = '';
    let dilutionFactor = '1';

    if (cols.length === 1) {
      // Single value: treat as absorbance or name
      const num = parseFloat(cols[0]);
      if (Number.isFinite(num)) {
        abs = cols[0];
        name = `Sample ${currentLength + rows.length + 1}`;
      } else {
        name = cols[0];
      }
    } else if (cols.length === 2) {
      // [Name, Abs] OR [Abs, Replicates]
      const secondIsNum = Number.isFinite(parseFloat(cols[1]));
      if (secondIsNum) {
        name = cols[0];
        abs = cols[1];
      } else {
        name = cols[0];
        abs = cols[1];
      }
    } else if (cols.length === 3) {
      // Could be [SampleId, Name, Abs] OR [Name, Abs, Replicates]
      const c1IsNum = Number.isFinite(parseFloat(cols[1]));
      const c2IsNum = Number.isFinite(parseFloat(cols[2]));
      if (c1IsNum && !c2IsNum) {
        // [Name, Abs, Replicates]
        name = cols[0];
        abs = cols[1];
        replicates = cols[2];
      } else if (!c1IsNum && c2IsNum) {
        // [SampleId, Name, Abs]
        sampleId = cols[0] || sampleId;
        name = cols[1];
        abs = cols[2];
      } else {
        // Default to [Name, Abs, Replicates]
        name = cols[0];
        abs = cols[1];
        replicates = cols[2];
      }
    } else if (cols.length === 4) {
      // [SampleId, Name, Abs, Replicates]
      sampleId = cols[0] || sampleId;
      name = cols[1];
      abs = cols[2];
      replicates = cols[3];
    } else {
      // 5+ columns: [SampleId, Name, Abs, Replicates, DilutionFactor, ...]
      sampleId = cols[0] || sampleId;
      name = cols[1];
      abs = cols[2];
      replicates = cols[3];
      if (cols[4] && Number.isFinite(parseFloat(cols[4]))) {
        dilutionFactor = cols[4];
      }
    }

    if (name.trim() || abs.trim() || replicates.trim()) {
      rows.push({
        id: Math.random().toString(36).substring(2, 9),
        sampleId: sampleId.trim() || `S${currentLength + rows.length + 1}`,
        name: name.trim() || `Sample ${currentLength + rows.length + 1}`,
        abs: abs.trim(),
        replicates: replicates.trim(),
        dilutionFactor: dilutionFactor.trim() || '1',
      });
    }
  }

  return rows;
}

/**
 * Format Coagulation Assay Export CSV including all required metadata, raw measurements,
 * replicate count, mean, SD, CV, raw estimate, reportable status, range status, dilution factor,
 * canonical analytical status, study threshold, warnings, model equation, and timestamp.
 */
export function formatCoagulationCsv(options: {
  results: SampleEstimateResult[];
  calibration: CalibrationModelFit | null;
  runLabel: string;
  experimentId?: string;
  wavelength?: number;
  threshold: number;
  thresholdBasis?: string;
  softwareVersion?: string;
}): string {
  const {
    results,
    calibration,
    runLabel,
    experimentId = 'EXP-AM-2026-001',
    wavelength = 540,
    threshold,
    thresholdBasis = 'Investigational Study Threshold',
    softwareVersion = 'v2.4.0 (Research Edition)',
  } = options;

  const now = new Date().toISOString();
  const lines: string[] = [];

  // Metadata block
  lines.push('# ARCHACHATINA MARGINATA ENDOTOXIN BIOASSAY — RESEARCH EXPORT');
  lines.push('# Notice: Research & Educational Analysis Tool Only. Does not establish clinical or product-release conclusions.');
  lines.push(`Run Identifier,${escapeCsvCell(runLabel)}`);
  lines.push(`Experiment ID,${escapeCsvCell(experimentId)}`);
  lines.push(`Analysis Timestamp,${escapeCsvCell(now)}`);
  lines.push(`Software Version,${escapeCsvCell(softwareVersion)}`);
  lines.push(`Assay Wavelength (Record Metadata Only),${wavelength} nm`);
  lines.push(`Configured Study Threshold,${threshold.toFixed(4)} EU/mL`);
  lines.push(`Threshold Protocol Basis,${escapeCsvCell(thresholdBasis)}`);

  if (calibration) {
    const eq =
      calibration.type === 'linear'
        ? `y = ${(calibration.slope ?? 0).toFixed(6)}x + ${(calibration.intercept ?? 0).toFixed(6)}`
        : `y = ${(calibration.a ?? 0).toFixed(6)}x^2 + ${(calibration.b ?? 0).toFixed(6)}x + ${(calibration.c ?? 0).toFixed(6)}`;
    lines.push(`Calibration Model,${calibration.type.toUpperCase()}`);
    lines.push(`Calibration Equation,${escapeCsvCell(eq)}`);
    lines.push(`Calibration R-squared,${calibration.r2.toFixed(6)}`);
    lines.push(`Calibration Standards Range,${calibration.xMin.toFixed(4)} to ${calibration.xMax.toFixed(4)} EU/mL`);
  } else {
    lines.push('Calibration Model,None computed');
  }
  lines.push('');

  // Column Headers
  const headers = [
    'Sample ID',
    'Sample Name',
    'Raw Measurements (OD)',
    'Replicate Count (N)',
    'Mean Absorbance (OD)',
    'SD (OD)',
    'CV (%)',
    'Raw Estimate (EU/mL)',
    'Reportable Status',
    'Dilution Factor',
    'Calculated Concentration (EU/mL)',
    'Range Status',
    'Canonical Analytical Status',
    'Study Threshold Comparison',
    'Analytical Warnings',
    'Remarks',
  ];
  lines.push(headers.map(escapeCsvCell).join(','));

  // Data Rows
  results.forEach((r) => {
    const rawMeasures = r.replicates && r.replicates.length > 0 ? r.replicates.join(';') : r.abs.toFixed(4);
    const sdText = Number.isFinite(r.sd) ? r.sd.toFixed(6) : '';
    const cvText = Number.isFinite(r.cv) ? r.cv.toFixed(3) : '';
    const rawEstText = Number.isFinite(r.rawEu) ? r.rawEu.toFixed(6) : '';
    const repText = r.reportableText || '';
    const calcConcText =
      r.originalConcentration !== null && Number.isFinite(r.originalConcentration)
        ? r.originalConcentration.toFixed(4)
        : '';

    // Range status determination
    let rangeStatus = 'INTERPOLATED';
    if (calibration) {
      if (r.abs < (calibration.meta[0]?.mean ?? 0)) {
        rangeStatus = 'EXTRAPOLATED_LOW';
      } else if (r.abs > (calibration.meta[calibration.meta.length - 1]?.mean ?? 0)) {
        rangeStatus = 'EXTRAPOLATED_HIGH';
      }
    }

    // Warnings
    const warnings: string[] = [];
    if (Number.isFinite(r.cv) && r.cv > 15) {
      warnings.push(`High CV (${r.cv.toFixed(1)}% > 15%)`);
    }
    if (r.outOfRange) {
      warnings.push('Absorbance outside calibration standards');
    }
    if (r.negativeEstimate) {
      warnings.push('Negative raw curve inversion');
    }
    if (r.invalidInput) {
      warnings.push('Invalid absorbance reading');
    }

    const studyStatus =
      r.compliance === 'PASS'
        ? 'BELOW_THRESHOLD'
        : r.compliance === 'FLAGGED'
        ? 'ABOVE_THRESHOLD'
        : 'INCONCLUSIVE';

    const rowCols = [
      r.sampleId,
      r.name,
      rawMeasures,
      r.n.toString(),
      r.abs.toFixed(4),
      sdText,
      cvText,
      rawEstText,
      repText,
      r.dilutionFactor.toString(),
      calcConcText,
      rangeStatus,
      r.analyticalStatus,
      studyStatus,
      warnings.join('; ') || 'None',
      r.remark,
    ];
    lines.push(rowCols.map(escapeCsvCell).join(','));
  });

  return lines.join('\n');
}

/**
 * Format Phenoloxidase Kinetic Assay Export CSV.
 */
export function formatKineticCsv(options: {
  results: KineticResult[];
  model: KineticCalibrationModel | null;
  runLabel: string;
  experimentId?: string;
  wavelength?: number;
  threshold: number;
  softwareVersion?: string;
}): string {
  const {
    results,
    model,
    runLabel,
    experimentId = 'EXP-AM-2026-001',
    wavelength = 490,
    threshold,
    softwareVersion = 'v2.4.0 (Research Edition)',
  } = options;

  const now = new Date().toISOString();
  const lines: string[] = [];

  lines.push('# PHENOLOXIDASE KINETIC ASSAY — RESEARCH EXPORT');
  lines.push('# Notice: Research & Educational Analysis Tool Only. Does not establish clinical or product-release conclusions.');
  lines.push(`Run Identifier,${escapeCsvCell(runLabel)}`);
  lines.push(`Experiment ID,${escapeCsvCell(experimentId)}`);
  lines.push(`Analysis Timestamp,${escapeCsvCell(now)}`);
  lines.push(`Software Version,${escapeCsvCell(softwareVersion)}`);
  lines.push(`Kinetic Wavelength (Record Metadata Only),${wavelength} nm`);
  lines.push(`Configured Study Threshold,${threshold.toFixed(4)} EU/mL`);

  if (model) {
    lines.push(
      `PO Calibration Model,Rate = ${model.slope.toFixed(6)} * [EU] + ${model.intercept.toFixed(6)}`
    );
    lines.push(`PO Calibration R-squared,${model.r2.toFixed(6)}`);
  } else {
    lines.push('PO Calibration Model,None computed');
  }
  lines.push('');

  const headers = [
    'Sample ID',
    'Sample Type',
    'Fraction / Sample Name',
    'Kinetic Velocity (OD/min)',
    'Linearity (R2)',
    'Total Delta Abs',
    'Initial Abs',
    'Final Abs',
    'Nominal Standard EU/mL',
    'Reported EU/mL',
    'Canonical Analytical Status',
    'Study Threshold Comparison',
    'Remarks',
  ];
  lines.push(headers.map(escapeCsvCell).join(','));

  results.forEach((k) => {
    const rateText = Number.isFinite(k.rate) ? k.rate.toFixed(6) : '';
    const r2Text = Number.isFinite(k.r2) ? k.r2.toFixed(4) : '';
    const deltaText = Number.isFinite(k.deltaAbs) ? k.deltaAbs.toFixed(4) : '';
    const repText =
      k.reportedEu !== null && Number.isFinite(k.reportedEu)
        ? k.reportedEu.toFixed(4)
        : k.reportableText || '';
    const stdText = k.standardEu !== undefined ? k.standardEu.toFixed(4) : '';

    const studyStatus =
      k.compliance === 'PASS'
        ? 'BELOW_THRESHOLD'
        : k.compliance === 'FLAGGED'
        ? 'ABOVE_THRESHOLD'
        : 'INCONCLUSIVE';

    const rowCols = [
      k.sampleId,
      k.type,
      k.name,
      rateText,
      r2Text,
      deltaText,
      k.initialAbs.toFixed(4),
      k.finalAbs.toFixed(4),
      stdText,
      repText,
      k.analyticalStatus,
      studyStatus,
      k.remark,
    ];
    lines.push(rowCols.map(escapeCsvCell).join(','));
  });

  return lines.join('\n');
}

/**
 * Format Exploratory Method Comparison Export CSV.
 */
export function formatComparisonCsv(options: {
  comparisons: AssayComparisonItem[];
  runLabel: string;
  experimentId?: string;
  coagWavelength?: number;
  poWavelength?: number;
  softwareVersion?: string;
}): string {
  const {
    comparisons,
    runLabel,
    experimentId = 'EXP-AM-2026-001',
    coagWavelength = 540,
    poWavelength = 490,
    softwareVersion = 'v2.4.0 (Research Edition)',
  } = options;

  const now = new Date().toISOString();
  const lines: string[] = [];

  lines.push('# EXPLORATORY CROSS-ASSAY METHOD COMPARISON — RESEARCH EXPORT');
  lines.push('# Notice: Research & Educational Analysis Tool Only. Does not establish clinical equivalence or product release.');
  lines.push(`Run Identifier,${escapeCsvCell(runLabel)}`);
  lines.push(`Experiment ID,${escapeCsvCell(experimentId)}`);
  lines.push(`Analysis Timestamp,${escapeCsvCell(now)}`);
  lines.push(`Software Version,${escapeCsvCell(softwareVersion)}`);
  lines.push(`Assay Wavelengths (Record Metadata Only),Coagulation ${coagWavelength} nm | Phenoloxidase ${poWavelength} nm`);
  lines.push('');

  const headers = [
    'Sample ID',
    'Sample Name',
    'Coagulation EU/mL',
    'Coagulation Abs (OD)',
    'Phenoloxidase EU/mL',
    'PO Velocity (OD/min)',
    'Absolute Difference (|ΔEU|)',
    'Relative Percent Difference (RPD %)',
    'Assay Ratio (Coag/PO)',
    'Statistical Eligibility',
    'Cross-Assay Concordance',
    'Comment / Classification',
  ];
  lines.push(headers.map(escapeCsvCell).join(','));

  comparisons.forEach((c) => {
    const coagStr = c.coagEu !== null ? c.coagEu.toFixed(4) : '';
    const poStr = c.poEu !== null ? c.poEu.toFixed(4) : '';
    const diffStr = c.absDiff !== null ? c.absDiff.toFixed(4) : '';
    const rpdStr = c.rpd !== null ? c.rpd.toFixed(2) : '';
    const ratioStr = c.ratio !== null ? c.ratio.toFixed(3) : '';
    const eligibilityStr = c.isEligibleForQuantitativeStats ? 'ELIGIBLE' : 'EXCLUDED';

    const rowCols = [
      c.sampleId,
      c.name,
      coagStr,
      c.coagAbs.toFixed(4),
      poStr,
      c.poRate.toFixed(5),
      diffStr,
      rpdStr,
      ratioStr,
      eligibilityStr,
      c.concordance,
      c.comment,
    ];
    lines.push(rowCols.map(escapeCsvCell).join(','));
  });

  return lines.join('\n');
}
