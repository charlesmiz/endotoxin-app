import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { generateAnalyticalInterpretation } from './src/utils/analyticalFallback';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '2mb' }));

// Lazy GoogleGenAI initialization
let genAiClient: GoogleGenAI | null = null;
function getGenAi(): GoogleGenAI {
  if (!genAiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing.');
    }
    genAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAiClient;
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', hasGeminiKey: Boolean(process.env.GEMINI_API_KEY) });
});

// Candidate models in order of priority
const CANDIDATE_MODELS = [
  'gemini-flash-latest',
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
];

async function callGeminiWithResilience(
  promptText: string,
  systemInstruction: string
): Promise<{ text: string; model: string }> {
  const ai = getGenAi();
  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[Gemini API] Requesting ${model} (attempt ${attempt}/2)...`);
        const response = await ai.models.generateContent({
          model,
          contents: promptText,
          config: {
            systemInstruction,
            temperature: 0.3,
          },
        });

        if (response.text && response.text.trim().length > 0) {
          console.log(`[Gemini API] Success with ${model}`);
          return { text: response.text, model };
        }
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || err);
        console.warn(`[Gemini API] Model ${model} attempt ${attempt} failed: ${msg}`);

        const isTransient =
          msg.includes('503') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('high demand') ||
          msg.includes('429') ||
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('timeout') ||
          msg.includes('ECONNRESET');

        if (!isTransient) {
          // If non-transient, skip retrying this specific model
          break;
        }

        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
        }
      }
    }
  }

  throw lastError || new Error('All candidate models were unavailable.');
}

// Explain result endpoint
app.post('/api/explain-result', async (req, res) => {
  try {
    const summaryData = req.body;

    if (!summaryData || typeof summaryData !== 'object') {
      res.status(400).json({
        error: 'The explanation cannot be generated: Invalid summary payload.',
      });
      return;
    }

    const {
      runLabel,
      threshold,
      wavelengths,
      calibration,
      coagSamples,
      kineticModel,
      kineticSamples,
      comparisons,
    } = summaryData;

    // Check if at least one assay has computed results
    const hasCoag = Boolean(
      (calibration && Number.isFinite(calibration.r2)) ||
        (Array.isArray(coagSamples) && coagSamples.length > 0)
    );
    const hasPo = Boolean(
      (kineticModel && Number.isFinite(kineticModel.r2)) ||
        (Array.isArray(kineticSamples) && kineticSamples.length > 0)
    );

    if (!hasCoag && !hasPo) {
      res.status(400).json({
        error:
          'The explanation cannot be generated because no assay calibration or sample results have been computed yet. Please complete a standard curve or kinetic run first.',
      });
      return;
    }

    const systemInstruction = `You are an expert biochemistry laboratory instructor explaining validation report findings to undergraduate and graduate biochemistry students.
The assay tests bacterial endotoxin (LPS) using Archachatina marginata (giant African land snail) hemolymph via two independent pathways: physical protein coagulation (turbidity) and phenoloxidase (PO) enzymatic velocity (dopachrome formation).

CRITICAL REQUIREMENT: KEEP THE EXPLANATION CONCISE, PUNCHY, AND STUDENT-FRIENDLY (UNDER 200 WORDS TOTAL). Avoid long walls of text, repetitive jargon, or unnecessary metric definitions.

Structure the explanation into exactly these 4 clear sections:
### 🔬 Summary for Biochemistry Students
(Explain in 2 short sentences what this validation report proves: whether the test fluids contain pyrogens and whether the two biological defense pathways corroborate each other.)

### 🧪 Sample Findings & Biological Consequence
(Bullet points for each sample evaluated. State whether it is within the safe limit (< ${threshold ?? 0.5} EU/mL) or flagged above threshold, and the biochemical consequence in hemolymph: e.g. inactive clotting factors vs. endotoxin-triggered coagulin polymerization/elevated enzyme oxidation.)

### ⚖️ Cross-Assay Concordance & Analytical Consequence
(State if the physical clotting and enzymatic velocity pathways agree [RPD ≤ 20%]. If discordant [RPD > 30%], explain the biochemical consequence: potential optical turbidity interference, sample color bias, or enzyme inhibition, and advise testing 1–2 dilution replicates.)

### 🎓 Key Takeaway
(One punchy sentence summarizing the main conclusion for the student's lab notebook.)

STRICT RULES:
- Use only the provided numbers and sample names. Do NOT invent data.
- Do NOT make clinical/medical release claims (this is academic research bioassay).
- Keep total length concise and easily readable.`;

    const promptText = `Please analyze the following laboratory run summary data:
Run Identifier: ${runLabel || 'Run 1'}
Safety Threshold: ${threshold ?? 0.5} EU/mL
Wavelengths: Coagulation = ${wavelengths?.coagulation ?? 540} nm, Phenoloxidase = ${wavelengths?.phenoloxidase ?? 490} nm

1. Protein Coagulation Assay:
${
  calibration
    ? `- Calibration Fit: R² = ${calibration.r2?.toFixed?.(4) ?? calibration.r2}, Slope = ${calibration.slope?.toFixed?.(4) ?? calibration.slope}, Intercept = ${calibration.intercept?.toFixed?.(4) ?? calibration.intercept}`
    : '- Calibration Fit: Not computed'
}
${
  Array.isArray(coagSamples) && coagSamples.length > 0
    ? `- Samples Evaluated (${coagSamples.length}):\n` +
      coagSamples
        .map(
          (s: any) =>
            `  • Sample "${s.name}": Mean Abs = ${s.abs?.toFixed?.(3) ?? s.abs}, Estimated EU/mL = ${s.eu?.toFixed?.(3) ?? s.eu}, Replicates n = ${s.n ?? 1}, CV% = ${s.cv?.toFixed?.(1) ?? s.cv}%, Status = ${s.status}`
        )
        .join('\n')
    : '- Samples Evaluated: None'
}

2. Phenoloxidase (PO) Kinetic Assay:
${
  kineticModel
    ? `- Kinetic Calibration Fit: R² = ${kineticModel.r2?.toFixed?.(4) ?? kineticModel.r2}, Slope = ${kineticModel.slope?.toFixed?.(5) ?? kineticModel.slope}, Intercept = ${kineticModel.intercept?.toFixed?.(5) ?? kineticModel.intercept}`
    : '- Kinetic Calibration Fit: Not computed'
}
${
  Array.isArray(kineticSamples) && kineticSamples.length > 0
    ? `- PO Series Analyzed (${kineticSamples.length}):\n` +
      kineticSamples
        .map(
          (k: any) =>
            `  • Sample "${k.name}": Rate = ${k.rate?.toFixed?.(5) ?? k.rate} dA/min, R² = ${k.r2?.toFixed?.(4) ?? k.r2}, Estimated EU/mL = ${k.estimatedEu !== undefined ? k.estimatedEu.toFixed(3) : 'N/A'}, Activity Label = ${k.activityLevel?.toUpperCase() ?? 'ACTIVE'}`
        )
        .join('\n')
    : '- PO Series Analyzed: None'
}

3. Dual-Assay Orthogonal Cross-Validation:
${
  Array.isArray(comparisons) && comparisons.length > 0
    ? `- Matched Samples (${comparisons.length}):\n` +
      comparisons
        .map(
          (c: any) =>
            `  • Sample "${c.name}": Coag = ${c.coagEu?.toFixed?.(3) ?? c.coagEu} EU/mL, PO = ${c.poEu?.toFixed?.(3) ?? c.poEu} EU/mL, |ΔEU| = ${c.absDiff?.toFixed?.(3) ?? c.absDiff}, RPD = ${c.rpd?.toFixed?.(1) ?? c.rpd}%, Ratio = ${c.ratio?.toFixed?.(2) ?? c.ratio}, Concordance Status = ${c.concordance?.toUpperCase()}`
        )
        .join('\n')
    : '- Matched Samples: None'
}

Please provide a plain-language, structured interpretation following all system instructions.`;

    let explanation = '';
    let isFallback = false;
    let sourceModel = '';

    try {
      const result = await callGeminiWithResilience(promptText, systemInstruction);
      explanation = result.text;
      sourceModel = result.model;
    } catch (geminiError: any) {
      console.warn(
        '[Gemini API] Models unavailable or experiencing demand spike. Engaging rule-based analytical engine...',
        geminiError?.message || geminiError
      );

      // Deterministic rule-based analytical synthesis
      explanation = generateAnalyticalInterpretation(summaryData);
      isFallback = true;
      sourceModel = 'rule-based-engine';
    }

    res.json({
      explanation,
      isFallback,
      sourceModel,
      notice: isFallback
        ? 'Generated via local rule-based analytical engine due to temporary upstream AI demand spikes. You can click Refresh anytime to re-query with Gemini.'
        : undefined,
    });
  } catch (error: any) {
    console.error('Error generating result explanation:', error);
    let friendlyError = error?.message || 'An error occurred while generating the explanation.';
    try {
      const parsed = JSON.parse(friendlyError);
      if (parsed.error?.message) {
        friendlyError = parsed.error.message;
      }
    } catch {
      // not json
    }
    res.status(500).json({
      error: friendlyError,
    });
  }
});

// Vite dev server / static serving
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production' && !process.argv[1]?.endsWith('server.cjs');
  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
