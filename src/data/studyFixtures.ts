import { CalibrationRow, SampleRow, KineticSampleRow, CalibrationPointMeta } from '../types';

/**
 * Deterministic full-study fixture for Archachatina marginata dual-assay evaluation.
 * Used for example loading and automated test verification without arbitrary delays.
 */
export const DETERMINISTIC_STUDY_FIXTURE = {
  timePoints: [0, 2, 4, 6, 8, 10],

  calRows: [
    {
      id: 'cal-std-0',
      eu: '0.0',
      abs: '0.0050',
      replicates: '0.004, 0.006',
      meanReadOnly: false,
    },
    {
      id: 'cal-std-1',
      eu: '0.5',
      abs: '0.0480',
      replicates: '0.047, 0.049',
      meanReadOnly: false,
    },
    {
      id: 'cal-std-2',
      eu: '2.0',
      abs: '0.1850',
      replicates: '0.184, 0.186',
      meanReadOnly: false,
    },
    {
      id: 'cal-std-3',
      eu: '5.0',
      abs: '0.4520',
      replicates: '0.450, 0.454',
      meanReadOnly: false,
    },
  ] as CalibrationRow[],

  calibrationPoints: [
    [0.0, 0.005],
    [0.5, 0.048],
    [2.0, 0.185],
    [5.0, 0.452],
  ] as [number, number][],

  calibrationMeta: [
    { eu: 0.0, mean: 0.005, sd: 0.001414, cv: 28.28, n: 2, replicates: [0.004, 0.006] },
    { eu: 0.5, mean: 0.048, sd: 0.001414, cv: 2.95, n: 2, replicates: [0.047, 0.049] },
    { eu: 2.0, mean: 0.185, sd: 0.001414, cv: 0.76, n: 2, replicates: [0.184, 0.186] },
    { eu: 5.0, mean: 0.452, sd: 0.002828, cv: 0.63, n: 2, replicates: [0.450, 0.454] },
  ] as CalibrationPointMeta[],

  sampleRows: [
    {
      id: 'smp-1',
      sampleId: 'S1',
      name: 'Commercial Infusion A (Batch 101)',
      abs: '0.0820',
      replicates: '0.081, 0.083',
      dilutionFactor: '1',
    },
    {
      id: 'smp-2',
      sampleId: 'S2',
      name: 'Sterile Water For Injection Control',
      abs: '0.0080',
      replicates: '0.007, 0.009',
      dilutionFactor: '1',
    },
    {
      id: 'smp-3',
      sampleId: 'S3',
      name: 'Commercial Infusion B (Batch 204)',
      abs: '0.3100',
      replicates: '0.308, 0.312',
      dilutionFactor: '1',
    },
  ] as SampleRow[],

  kineticRows: [
    {
      id: 'k-std-0',
      sampleId: 'STD0',
      name: 'Standard Cal Blank (0.0 EU/mL)',
      type: 'standard',
      standardEu: '0.0',
      inputMode: 'series',
      readings: { 0: '0.010', 2: '0.011', 4: '0.011', 6: '0.012', 8: '0.012', 10: '0.013' },
    },
    {
      id: 'k-std-1',
      sampleId: 'STD1',
      name: 'Standard 0.5 EU/mL',
      type: 'standard',
      standardEu: '0.5',
      inputMode: 'series',
      readings: { 0: '0.020', 2: '0.027', 4: '0.035', 6: '0.043', 8: '0.050', 10: '0.058' },
    },
    {
      id: 'k-std-2',
      sampleId: 'STD2',
      name: 'Standard 2.0 EU/mL',
      type: 'standard',
      standardEu: '2.0',
      inputMode: 'series',
      readings: { 0: '0.030', 2: '0.058', 4: '0.086', 6: '0.114', 8: '0.142', 10: '0.170' },
    },
    {
      id: 'k-std-3',
      sampleId: 'STD3',
      name: 'Standard 5.0 EU/mL',
      type: 'standard',
      standardEu: '5.0',
      inputMode: 'series',
      readings: { 0: '0.045', 2: '0.115', 4: '0.185', 6: '0.255', 8: '0.325', 10: '0.395' },
    },
    {
      id: 'k-smp-1',
      sampleId: 'S1',
      name: 'Commercial Infusion A (Batch 101)',
      type: 'sample',
      inputMode: 'series',
      readings: { 0: '0.025', 2: '0.038', 4: '0.052', 6: '0.065', 8: '0.078', 10: '0.091' },
    },
    {
      id: 'k-smp-2',
      sampleId: 'S2',
      name: 'Sterile Water For Injection Control',
      type: 'sample',
      inputMode: 'series',
      readings: { 0: '0.010', 2: '0.011', 4: '0.010', 6: '0.012', 8: '0.011', 10: '0.013' },
    },
    {
      id: 'k-smp-3',
      sampleId: 'S3',
      name: 'Commercial Infusion B (Batch 204)',
      type: 'sample',
      inputMode: 'series',
      readings: { 0: '0.035', 2: '0.089', 4: '0.143', 6: '0.197', 8: '0.251', 10: '0.305' },
    },
  ] as KineticSampleRow[],
};
