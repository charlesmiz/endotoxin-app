import { describe, it, expect } from 'vitest';
import { parseCsv, escapeCsvCell, parseSampleCsvImport, formatCoagulationCsv } from './csv';
import { SampleEstimateResult, CalibrationModelFit } from '../types';

describe('P. Standards-Compliant CSV Parser & Exporter', () => {
  it('parses standard unquoted CSV correctly', () => {
    const csv = 'Sample,Absorbance,Replicates\nS1,0.082,0.081, 0.083\nS2,0.008,0.008';
    const parsed = parseCsv(csv);
    expect(parsed.length).toBe(3);
    expect(parsed[0]).toEqual(['Sample', 'Absorbance', 'Replicates']);
    expect(parsed[1][0]).toBe('S1');
    expect(parsed[1][1]).toBe('0.082');
  });

  it('correctly handles quoted fields containing commas without breaking names', () => {
    const csv = '"Commercial Infusion A, Batch 102",0.082,"0.081, 0.083",1\n"Normal Saline, USP, 500mL",0.008,"0.008, 0.009",1';
    const parsed = parseCsv(csv);
    expect(parsed.length).toBe(2);
    expect(parsed[0][0]).toBe('Commercial Infusion A, Batch 102');
    expect(parsed[0][1]).toBe('0.082');
    expect(parsed[0][2]).toBe('0.081, 0.083');
    expect(parsed[0][3]).toBe('1');
    expect(parsed[1][0]).toBe('Normal Saline, USP, 500mL');
  });

  it('handles escaped double quotes in cell content', () => {
    const csv = '"Infusion with ""Special"" additive",0.125\n"Standard ""A""",0.450';
    const parsed = parseCsv(csv);
    expect(parsed[0][0]).toBe('Infusion with "Special" additive');
    expect(parsed[1][0]).toBe('Standard "A"');
  });

  it('handles CRLF line endings and trailing empty lines', () => {
    const csv = 'A,B,C\r\n1,2,3\r\n4,5,6\r\n\r\n';
    const parsed = parseCsv(csv);
    expect(parsed.length).toBe(3);
    expect(parsed[1]).toEqual(['1', '2', '3']);
    expect(parsed[2]).toEqual(['4', '5', '6']);
  });

  it('escapeCsvCell correctly quotes strings with commas, quotes, or newlines', () => {
    expect(escapeCsvCell('Simple')).toBe('Simple');
    expect(escapeCsvCell('With, comma')).toBe('"With, comma"');
    expect(escapeCsvCell('With "quote"')).toBe('"With ""quote"""');
    expect(escapeCsvCell('Line1\nLine2')).toBe('"Line1\nLine2"');
    expect(escapeCsvCell(12.345)).toBe('12.345');
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell(undefined)).toBe('');
  });

  it('parseSampleCsvImport extracts SampleRow array safely while skipping header', () => {
    const input = `Sample ID,Sample Description,Absorbance,Replicates,Dilution\nS1,"Commercial Infusion A, USP",0.082,"0.081, 0.083",2\nS2,"Sterile Saline, Batch #44",0.008,0.008,1`;
    const rows = parseSampleCsvImport(input, 0);
    expect(rows.length).toBe(2);
    expect(rows[0].sampleId).toBe('S1');
    expect(rows[0].name).toBe('Commercial Infusion A, USP');
    expect(rows[0].abs).toBe('0.082');
    expect(rows[0].replicates).toBe('0.081, 0.083');
    expect(rows[0].dilutionFactor).toBe('2');

    expect(rows[1].sampleId).toBe('S2');
    expect(rows[1].name).toBe('Sterile Saline, Batch #44');
  });

  it('formatCoagulationCsv includes all required fields and canonical analytical status', () => {
    const sampleResults: SampleEstimateResult[] = [
      {
        id: 's1',
        sampleId: 'S1',
        runId: 'Run 1',
        name: 'Sample 1',
        abs: 0.082,
        sd: 0.0014,
        cv: 1.7,
        n: 2,
        replicates: [0.081, 0.083],
        invalidTokens: [],
        rawEu: 0.858,
        eu: 0.858,
        reportedEu: 0.858,
        dilutionFactor: 1,
        originalConcentration: 0.858,
        reportableText: '0.858 EU/mL',
        analyticalStatus: 'WITHIN_RANGE',
        compliance: 'FLAGGED',
        status: 'FLAGGED',
        remark: 'Above configured study threshold (0.858 > 0.500 EU/mL); analytical follow-up recommended.',
        outOfRange: false,
        invalidInput: false,
        negativeEstimate: false,
        ambiguous: false,
        noSolution: false,
      },
    ];

    const calFit: CalibrationModelFit = {
      model: 'linear',
      requestedModel: 'linear',
      type: 'linear',
      slope: 0.089855,
      intercept: 0.004868,
      r2: 0.9998,
      points: [[0, 0.005], [5, 0.452]],
      meta: [
        { eu: 0, mean: 0.005, sd: NaN, cv: NaN, n: 1, replicates: [] },
        { eu: 5, mean: 0.452, sd: NaN, cv: NaN, n: 1, replicates: [] },
      ],
      xMin: 0,
      xMax: 5,
      isValidCalibration: true,
    };

    const csvOutput = formatCoagulationCsv({
      results: sampleResults,
      calibration: calFit,
      runLabel: 'Run 1',
      experimentId: 'EXP-AM-2026-001',
      threshold: 0.50,
      thresholdBasis: 'Study Protocol Basis',
    });

    expect(csvOutput).toContain('Run Identifier,Run 1');
    expect(csvOutput).toContain('Experiment ID,EXP-AM-2026-001');
    expect(csvOutput).toContain('Calibration Model,LINEAR');
    expect(csvOutput).toContain('Canonical Analytical Status');
    expect(csvOutput).toContain('WITHIN_RANGE');
    expect(csvOutput).toContain('ABOVE_THRESHOLD');
    expect(csvOutput).toContain('0.858');
    expect(csvOutput).toContain('INTERPOLATED');
  });
});
