# CHANGELOG — Archachatina marginata Dual-Assay Analysis Suite

All notable analytical, statistical, UX, and architectural changes in this repository are documented below.

## [v2.4.0-research] — 2026-09-15

### 1. Statistical & Regression Calculations
- **Sample Variance / Standard Deviation**: Fixed denominator across all sample variance calculations to use $N-1$ Bessel's correction instead of population $N$. Added explicit guard returning `NaN` for single replicates ($N = 1$).
- **Coefficient of Variation (%CV)**: Standardized to $|SD / \text{mean}| \times 100\%$. Returns `NaN` when $N < 2$ or mean $\le 0$.
- **Regression ANOVA Table & F-Test p-Value**: Replaced asymptotic Chi-Square / Normal approximations with true regularized incomplete beta function (`betainc`) for exact Fisher-Snedecor $F(df_1, df_2)$ cumulative distribution calculation. Added complete Regression ANOVA table reporting $SS_{reg}, SS_{res}, MS_{reg}, MS_{res}, F$, and exact $p$-value.
- **Ordinary Least Squares (OLS)**: Added collinearity and singular matrix detection ($SS_{xx} \le 10^{-12}$).
- **Quadratic Regression Matrix Inversion**: Added condition number check ($> 10^{12}$) and determinant check ($|\det| \le 10^{-14}$) on the normal equations Vandermonde matrix. Explicitly prevents ill-conditioned polynomial inversion and falls back to linear OLS with user-visible notice.
- **Root Multiplicity in Quadratic Inversion**: Handled single-root, duplicate roots, and multiple distinct real roots within the calibration range ($[x_{min}, x_{max}]$). If two valid roots fall in range, sample is flagged as `AMBIGUOUS_ROOTS` rather than picking an arbitrary root.
- **Passing–Bablok Nonparametric Regression**: Corrected median slope estimator to compute median of pairwise slopes for all pairs where $x_j > x_i$ (or $x_j \ne x_i$). Added Kendall's $\tau$ score and bootstrap percentile confidence intervals.
- **Deming Orthogonal Regression**: Corrected error variance ratio ($\delta = \lambda = \sigma^2_\epsilon / \sigma^2_\eta$) handling and added exact jackknife standard error calculation.
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
