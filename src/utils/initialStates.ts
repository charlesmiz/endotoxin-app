import {
  PoStandardRow,
  CalibrationRow,
  SampleRow,
  PoSampleRow,
} from '../types';

/**
 * Robust row ID generator using crypto.randomUUID() with fallback
 */
export function generateRowId(prefix = 'row'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function createBlankPoStandardRow(): PoStandardRow {
  return {
    id: generateRowId('po_std'),
    standardEu: '',
    name: '',
    directRate: '',
    readings: {},
  };
}

export function createBlankCalRow(): CalibrationRow {
  return {
    id: generateRowId('cal'),
    eu: '',
    abs: '',
    replicates: '',
  };
}

export function createBlankCoagSampleRow(): SampleRow {
  return {
    id: generateRowId('coag_smp'),
    sampleId: '',
    name: '',
    abs: '',
    replicates: '',
    dilutionFactor: '',
  };
}

export function createBlankPoSampleRow(): PoSampleRow {
  return {
    id: generateRowId('po_smp'),
    sampleId: '',
    name: '',
    directRate: '',
    readings: {},
  };
}

// Initial state: EMPTY_PO_STANDARD_ROWS must contain 2 rows, each with standardEu: '', name: '', directRate: '', readings: {}.
export const EMPTY_PO_STANDARD_ROWS: PoStandardRow[] = [
  createBlankPoStandardRow(),
  createBlankPoStandardRow(),
];

export const EMPTY_CAL_ROWS: CalibrationRow[] = [
  createBlankCalRow(),
  createBlankCalRow(),
];

export const EMPTY_COAG_SAMPLE_ROWS: SampleRow[] = [
  createBlankCoagSampleRow(),
  createBlankCoagSampleRow(),
];

export const EMPTY_PO_SAMPLE_ROWS: PoSampleRow[] = [
  createBlankPoSampleRow(),
  createBlankPoSampleRow(),
];
