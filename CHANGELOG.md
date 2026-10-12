# CHANGELOG — Archachatina marginata Dual-Assay Analysis Suite

## [v2.5.0-research] — 2026-10-12

### Method comparison
- Samples are paired by name (or an optional Pair ID), never by row position. Samples measured in only one assay are listed as unpaired and are not counted in the statistics.
- Added a pairing summary (unique, paired, coagulation-only, PO-only), duplicate-name detection and possible-typo warnings.
- Pairs with a negative, below-blank or out-of-range estimate are excluded from the agreement statistics; their RPD is "not evaluable" and they can no longer be classed as Tier 1.
- Added a near-constant-axis warning (difference-on-mean slope close to -2) and a diagnostic-only banner.
- Fixed the direction of the Deming variance ratio lambda for lambda != 1 so that it follows the documented convention lambda = Var(error in x) / Var(error in y). Results at lambda = 1 are unchanged.
- The executive summary now uses the same eligible-pair logic as the comparison section: mean RPD and the high-concordance count are computed over eligible pairs only, excluded pairs are reported, and "not evaluable" is shown when no pair is eligible.

### Input tables
- All input tables start blank; "Add row" no longer fills in values; row IDs use random identifiers.
- Added a "points used in calibration" list and warnings for skipped rows and duplicate concentrations.

### Verification, data and project
- Added tests for pairing, blank defaults, the 11-standard PO calibration, the agreement rules and the executive summary, plus a benchmark test against an independent implementation (src/utils/verifyEngine.test.ts).
- Added the data/ folder and research_scripts/verify_method_comparison.py.
- The software version now comes from one constant (src/version.ts) and matches package.json; the app screen and CSV exports show v2.5.0.

After editing, show me the first 40 lines of CHANGELOG.md.
All notable analytical, statistical, UX, and architectural changes in this repository are documented below.

## [v2.4.0-research] — 2026-09-15

### 1. Statistical & Regression Calculations
- **Sample Variance / Standard Deviation**: Fixed denominator across all sample variance calculations to use $N-1$ Bessel's correction instead of population $N$. Added explicit guard returning `NaN` for single replicates ($N = 1$).
- **Coefficient of Variation (%CV)**: Standardized to $|SD / \text{mean}| \times 100\%$. Returns `NaN` when $N < 2$ or mean $\le 0$.
- **Regression ANOVA Table & F-Test p-Value**: Replaced asymptotic Chi-Square / Normal approximations with true regularized incomplete beta function (`betainc`) for exact Fisher-Snedecor $F(df_1, df_2)$ cumulative distribution calculation. Added complete Regression ANOVA table reporting $SS_{reg}, SS_{res}, MS_{reg}, MS_{res}, F$, and exact $p$-value.
- **Ordinary Least Squares (OLS)**: Added collinearity and singular matrix detection ($SS_{xx} \le 10^{-12}$).
- **Quadratic Regression Matrix Inversion**: Added condition number check ($> 10^{12}$) and determinant check ($|\det| \le 10^{-14}$) on the normal equations Vandermonde matrix. Explicitly prevents ill-conditioned polynomial inversion and falls back to linear OLS with user-visible notice.
- **Root Multiplicity in Quadratic Inversion**: Handled single-root, duplicate roots, and multiple distinct real roots within the calibration range ($[x_{min}, x_{max}]$). If two valid roots fall in range, sample is flagged as `AMBIGUOUS_ROOTS` rather than picking an arbitrary root.
- **Deming Orthogonal Regression**: Explicit error-variance ratio $\lambda = \text{variance of measurement error in } X / \text{variance of measurement error in } Y$ (where $X$ is Coagulation and $Y$ is Phenoloxidase) and exact jackknife standard error calculation.
- **Bland–Altman Agreement**: Added standard error of mean bias ($\sqrt{s_d^2 / n}$) and 95% confidence intervals for both Upper and Lower Limits of Agreement (LoA). Corrected Relative Percent Difference formula to $(Y - X) / ((X + Y) / 2) \times 100\%$.

### 2. Analytical Validity vs. Study Decision Separation
- **Decoupled Validation Status**: Eliminated ambiguous dual-use badges. Separated analytical validity (`INTERPOLATED`, `EXTRAPOLATED_HIGH`, `EXTRAPOLATED_LOW`, `BELOW_BLANK`, `AMBIGUOUS_ROOTS`, `INVALID_INPUT`) from study cut-off decision (`Below Study Threshold (≤ threshold)`, `Above Study Threshold (> threshold)`, `Inconclusive`).
- **Research Neutrality & Non-Overclaiming**: Replaced all clinical and commercial batch-release claims (e.g. "safe pyrogen limit", "meets release specification", "product safe") with neutral investigational language (e.g. "Below configured study threshold", "Evaluated against study threshold with qualification"). Added persistent research-use disclaimers to calculation cards, reports, and exported files.

### 3. Data Flow & React State Architecture
- **Reactive Sample Estimations**: Updated `App.tsx` effect dependencies to track `[calibration, sampleRows, threshold, runLabel]`, ensuring sample concentrations update immediately upon threshold or replicate edits.
- **Deterministic Study Loader**: Removed race conditions and `setTimeout(50ms)` from full-study example loader. Loaded `DETERMINISTIC_STUDY_FIXTURE` and executed calibration, sample estimation, and PO kinetic models in a single atomic synchronous operation.

### 4. CSV Import & Export Standardization
- **RFC 4180 CSV Parser**: Replaced naive `line.split(',')` with an RFC 4180-compliant state-machine parser (`parseCsv` and `parseSampleCsvImport`) supporting quoted text with embedded commas, quotes, and newlines.
- **Comprehensive Audit Metadata in Exports**: Added raw measurements, replicate counts ($N$), mean, SD, CV, raw estimate, reportable text, range status, dilution factor, canonical analytical status, study threshold evaluation, warnings, calibration model equation, $R^2$, run ID, experiment ID, documentation wavelengths, software version, and ISO timestamps to all exports.

### 5. Documentation & Wavelength Clarifications
- **Explicit Metadata Labeling**: Renamed wavelength inputs to "Doc Metadata $\lambda$ (nm)" across Header, Standard Curve, and Phenoloxidase tabs, explicitly indicating they are recordkeeping parameters that do not alter the spectrophotometric regression math.
- **Scientific Decision Placeholders**: Identified parameters requiring investigator/reference decision and annotated them with explicit configuration notes and user-configurable inputs (e.g., threshold basis, variance ratio $\delta$, decision cut-offs).
