# Data files

| File | What it is |
|---|---|
| `EXP-AM-2026-001_sample_results.csv` | **Real laboratory data** (experiment EXP-AM-2026-001, run 1, report of 11 Oct 2026): nine commercial IV-fluid samples measured with the turbidimetric coagulation assay (540 nm) and the kinetic phenoloxidase (PO) assay (490 nm). One row per Sample_ID; estimates are the app's values. |
| `EXP-AM-2026-001_coag_standards.csv` | The 9 coagulation standards (0-10 EU/mL, change in absorbance at 540 nm). |
| `EXP-AM-2026-001_po_standards.csv` | The 11 PO calibration standards (E0-E10, 0-10 EU/mL). Refitting gives slope 0.001930, intercept 0.028841, R² = 0.4861, matching the app. |
| `synthetic_verification_dataset.csv` | **Synthetic**, well-conditioned dataset (n = 20, NumPy seed 2026) used only to verify the Deming and Bland-Altman code. Not laboratory data. |

Notes
- Samples are paired by Sample_ID (name), never by row position. `Control E+` was measured only in the coagulation assay and `MET` (metronidazole IV fluid) only in the PO assay, so they are unpaired.
- All nine coagulation estimates are negative (below the blank): no sample had a quantifiable coagulation signal, so the app excludes all eight name-matched pairs from the agreement statistics.
- `EXP-AM-2026-001_coag_standards.csv` holds the nine coagulation standards (change in absorbance at 540 nm vs EU/mL); refitting the values as entered gives slope 0.0109, intercept 0.0644, R² = 0.3787, which matches the app (0.0110, 0.0651, 0.3780) to within rounding of the entered values.
- `research_scripts/iv_fluid_endotoxin_estimates.csv` is a small demonstration file for the Python script, not study data.

Reproduce the reference values
```
cd research_scripts
python3 verify_method_comparison.py ../data/synthetic_verification_dataset.csv
python3 verify_method_comparison.py                      # real data, diagnostic only
```
The test `src/utils/verifyEngine.test.ts` runs the app's own functions on the synthetic file and checks them against these reference values (`npm test`).
