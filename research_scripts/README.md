# Offline Research & CLI Python Scripts

This folder contains standalone offline data analysis scripts and reference datasets for the *Archachatina marginata* endotoxin research study.

---

### Files in this directory:
- **`endotoxin_validation.py`**: Standalone Python 3 CLI script for offline statistical calibration (OLS regression, ANOVA, Pearson correlation, CV%, and limit-of-detection calculations).
- **`iv_fluid_endotoxin_estimates.csv`**: Sample output CSV containing batch test data and endotoxin estimates for commercial IV infusions.

---

> **Note on Web Application Architecture:**
> The primary interactive web application (React, TypeScript, Tailwind CSS, Plotly.js) runs entirely from the project root (`/src/`, `/index.html`, `package.json`, and `vite.config.ts`).
> The scripts in this directory are purely supplementary tools for offline data processing in terminal environments and do not affect web app deployment.
