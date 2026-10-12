# Endotoxin Assay Calibration Tool

### Two-assay endotoxin analysis for *Archachatina marginata* hemolymph: turbidimetric coagulation and phenoloxidase (PO) kinetics

A browser-based research tool that fits calibration curves for two endotoxin bioassays, converts raw readings to endotoxin estimates (EU/mL), and compares the two assays with Deming regression and Bland-Altman analysis. Calibration, sample pairing and all statistics run in the browser. Optional online services add a plain-language interpretation and literature links.

> **Research use only.** This software is a research and educational tool. It does not establish clinical, regulatory, pharmacopeial, product-release or patient-safety conclusions.

- Version: **v2.5.0 (Research Edition)**
- License: MIT (see `LICENSE`)
- Archived release: https://doi.org/10.5281/zenodo.23172477
- Version history: see `CHANGELOG.md`

---

## What the app does

The interface has five numbered tabs.

| Tab | What it does |
|---|---|
| 1. Coagulation calibration | Fits the standard curve for the turbidimetric (540 nm) assay from standard concentrations and absorbances. Linear least squares with a regression ANOVA table; a quadratic fit is available, with checks for ill-conditioned fits and for ambiguous roots. |
| 2. PO kinetics | Calibrates the phenoloxidase (490 nm) assay. Each standard or sample can be entered as a direct rate (dA/min) or as absorbance readings over time, from which the rate is calculated. The calibration is a linear fit of rate against EU/mL. |
| 3. Sample estimator | Converts sample absorbances (with replicates and dilution factors) to EU/mL and labels each estimate: interpolated, extrapolated high or low, below blank, ambiguous roots, or invalid input. Estimates are compared with the configurable study threshold. |
| 4. Dual-assay comparison | Pairs coagulation and PO samples and runs the method comparison (see below). |
| 5. Validation report | A printable report of calibrations, estimates, pairing, agreement results and validation flags, with optional interpretation and literature links. |

### Input tables
- All tables start **blank**. Placeholders are hints only and are never used as data.
- **Add row** adds an empty row. Nothing is filled in unless you load an example.
- **Load Full Dual-Assay Study** loads a fixed example dataset. **Clear** returns the tables to blank.
- A standard or sample row is used only if it has a valid concentration and a valid reading. Rows that are skipped are reported, and duplicate standard concentrations produce a warning.

### Sample pairing
- Coagulation and PO samples are paired **by sample name** (case, spacing and punctuation differences are ignored), or by an optional **Pair ID** if you type one. They are never paired by row position.
- The comparison shows how many unique samples there are, how many are paired, and which are measured in only one assay. Unpaired samples are listed, never compared, and never counted in the statistics.
- Duplicate names within one assay are reported and not paired. Possible typos in unpaired names are shown as warnings and are never paired automatically.

### Method comparison
- A pair enters the agreement statistics only if both estimates are quantifiable: inside the calibrated range and not negative or below the blank.
- Pairs that are not quantifiable show their raw estimates and the absolute difference (|ΔEU|), receive no agreement tier, and their relative percent difference (RPD) is shown as not evaluable.
- **Deming regression**: error variance ratio λ = Var(error in x) / Var(error in y), where x is the coagulation estimate and y is the PO estimate (default λ = 1). Standard errors and 95% confidence intervals of the slope and intercept use the jackknife with a t distribution on n − 2 degrees of freedom.
- **Bland-Altman analysis**: mean bias with its 95% confidence interval, standard deviation of the differences, 95% limits of agreement with their confidence intervals, and a regression of the differences on the means.
- **Warnings**: a small-sample warning, a low-concentration warning, a warning when the difference-on-mean slope is close to −2 (the pattern produced when one assay is almost constant), and a diagnostic-only banner when non-quantifiable estimates are forced into the statistics.

### Exports
- CSV export from the calibration, PO, sample and comparison tabs.
- Print / PDF export of the validation report.

### Optional online services
The server (`server.ts`) hosts the built app in production and provides two optional endpoints, `/api/explain-result` (a plain-language interpretation from Gemini) and `/api/lookup-literature` (Semantic Scholar with a curated fallback). API keys stay on the server. If a service is unavailable, a deterministic rule-based interpretation is used. The calibration, pairing and statistics do not depend on these services.

**Privacy note.** The interpretation request contains processed per-sample results: sample names, mean absorbances, estimates, rates, calibration parameters and agreement results. It does not contain raw replicate readings or individual calibration-standard points. Do not put confidential identifiers in sample names.

---

## Running the web application

### Requirements
- Node.js **22.12 or newer** (needed by the test runner; the app itself needs Node 20 or newer)
- npm

### Install and run
```bash
npm install
npm run dev        # development server (default http://localhost:3000)
```

### Optional online services
```bash
cp .env.example .env
# edit .env and set GEMINI_API_KEY (and optionally SEMANTIC_SCHOLAR_API_KEY)
```
Without a key, the app still works and uses the deterministic fallback interpretation.

### Production build
```bash
npm run build      # builds the interface and bundles the server into dist/
npm start          # runs dist/server.cjs
```

---

## Tests and verification

```bash
npm test           # runs the full Vitest suite
```

The suite covers calibration and model selection, replicate handling, kinetic rates, sample pairing and the pairing summary, the agreement rules, Deming regression and its jackknife intervals, Bland-Altman statistics, blank-by-default input tables, and a benchmark in `src/utils/verifyEngine.test.ts`.

The Deming and Bland-Altman routines were compared with an independent Python implementation on a synthetic benchmark (`data/synthetic_verification_dataset.csv`, n = 20). To reproduce the reference values:

```bash
python3 research_scripts/verify_method_comparison.py data/synthetic_verification_dataset.csv
```
(requires Python 3, NumPy and SciPy)

---

## Data

The `data/` folder holds the study data and a synthetic benchmark; see `data/README.md`.

| File | Contents |
|---|---|
| `EXP-AM-2026-001_sample_results.csv` | Study samples with absorbances, rates and estimates from both assays |
| `EXP-AM-2026-001_coag_standards.csv` | Coagulation standards (0 to 10 EU/mL) |
| `EXP-AM-2026-001_po_standards.csv` | PO standards E0 to E10 (0 to 10 EU/mL) |
| `synthetic_verification_dataset.csv` | Synthetic data used only to verify the statistics |

---

## Repository structure

```text
├── src/
│   ├── components/        # React interface (tabs, charts, tables, report, lab manual)
│   ├── data/              # Example presets and study fixture
│   ├── utils/             # Calibration, pairing, Deming and Bland-Altman code, CSV, tests
│   ├── types.ts
│   ├── App.tsx
│   └── main.tsx
├── data/                  # Study data and synthetic benchmark
├── research_scripts/      # Python verification script and the standalone offline CLI
├── server.ts              # Express server: hosts the app, proxies the optional services
├── public/  index.html  package.json  vite.config.ts  tsconfig.json  metadata.json
├── .env.example           # Template for the optional API keys
├── CHANGELOG.md
└── LICENSE
```

The scripts in `research_scripts/` are separate from the web app. `endotoxin_validation.py` is an older standalone command-line tool for offline calibration statistics (ordinary least squares, ANOVA, Pearson correlation); it does not implement the dual-assay comparison. `iv_fluid_endotoxin_estimates.csv` is a small demonstration file for that script, not study data.

---

## Limitations

- Calibration and Deming regression assume linear relationships.
- A valid method comparison needs quantifiable estimates from both assays; the example study has none for the coagulation assay, so no agreement statistics are produced for it.
- The optional interpretation depends on an external model whose output varies between runs.
- The tool has not been benchmarked against *Limulus* amebocyte lysate (LAL) assays.

---

## Citation

Chukwuma CC, Salawu MO. Endotoxin Assay Calibration Tool, version 2.5.0. Zenodo. https://doi.org/10.5281/zenodo.23172477 *(update the DOI after the new release)*

## License

MIT. See `LICENSE`.
