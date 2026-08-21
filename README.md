# Endotoxin Assay Analytics & Validation Suite
### *Archachatina marginata* Hemolymph Coagulation & Phenoloxidase Assay System

A modern, high-precision web-based laboratory application and research toolkit for quantifying bacterial endotoxins via dual-pathway bioassays (turbidimetric coagulation & phenoloxidase kinetic activation).

---

## 📂 Repository Structure

```text
├── src/                      # Web Application Source Code
│   ├── components/           # React UI & Visualization Components (Tabs, Charts, Tables, SOP Manual)
│   ├── data/                 # Static metadata, example presets, icon sets
│   ├── utils/                # Statistical math engine (OLS linear regression, quadratic fits, ANOVA, Pearson r)
│   ├── types.ts              # TypeScript interface definitions
│   ├── App.tsx               # Main application container & tab state manager
│   ├── main.tsx              # React DOM entry point
│   └── index.css             # Tailwind CSS styling & print stylesheet
├── public/                   # Static web assets (Favicons, manifest icons)
├── research_scripts/         # 🔬 Standalone Offline Research & Python CLI Tools (Separated)
│   ├── endotoxin_validation.py  # Standalone Python CLI statistical validator
│   ├── iv_fluid_endotoxin_estimates.csv # Reference dataset for commercial infusions
│   └── README.md             # Documentation for offline research scripts
├── index.html                # Single-page HTML entry point
├── package.json              # Web app dependencies and scripts
├── tsconfig.json             # TypeScript compiler configuration
├── vite.config.ts            # Vite build and bundling configuration
└── metadata.json             # Applet metadata configuration
```

---

## 🚀 Running the Web Application

### Prerequisites
- Node.js (v18+ recommended)
- npm or pnpm or yarn

### Installation & Development
```bash
# 1. Install dependencies
npm install

# 2. Start the local development server
npm run dev

# 3. Build for production deployment
npm run build
```

---

## 🔬 Optional: Running the Python Offline Script

If you want to run the standalone Python CLI tool independently in a terminal:

```bash
python3 research_scripts/endotoxin_validation.py
```
