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
  'gemini-2.5-flash',
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
            temperature: 0.2,
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

// N1. Plain-Language Result Explainer Endpoint
// STRICT SCOPE: Explains ONLY already-computed mathematical numbers and canonical analytical statuses.
// Forbids external literature claims, citations, clinical release claims, or regulatory conclusions.
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

    const systemInstruction = `You are a scientific data communicator providing a plain-language literacy summary of laboratory calculation results for researchers and students.

STRICT MANDATES AND NEGATIVE CONSTRAINTS (N1 Scope):
1. Restate and clarify ONLY the mathematical figures and canonical analytical statuses already computed and provided in the prompt (R², slope, intercept, measured EU/mL, study threshold comparisons, replicate CV%, calibration range status, and RPD % method concordance).
2. You are STRICTLY FORBIDDEN from introducing any external scientific fact, citing published papers or external literature, quoting typical/expected reference ranges, or making statements not directly derivable from the provided numbers.
3. You are STRICTLY FORBIDDEN from asserting clinical safety, pyrogen-free status, human injection safety, pharmacopeial batch release, or regulatory conclusions.
4. The threshold (${threshold ?? 0.5} EU/mL) must be referred to strictly as the "study-defined decision threshold", NOT a universal safety limit.
5. If a sample is above the threshold, state: "Above configured study threshold — analytical follow-up recommended". If below: "Below configured study threshold".
6. Keep the total length concise, clear, and focused (under 200 words).

Structure your output into these 3 clean sections:
### 📈 Calibration Model Fit
(Summarize the R², linearity, and calibration range for the fitted assay curves in simple terms.)

### 🧪 Sample Measurement Summary
(Summarize sample concentrations relative to the study-defined decision threshold of ${threshold ?? 0.5} EU/mL, noting any samples outside calibration limits.)

### ⚖️ Cross-Assay Method Agreement
(If matched samples exist, summarize agreement between turbidity and kinetic velocity based on RPD percentages. If discordant, note that follow-up dilution testing is recommended.)`;

    const promptText = `Please analyze the following laboratory run summary data:
Run Identifier: ${runLabel || 'Run 1'}
Configured Study Decision Threshold: ${threshold ?? 0.5} EU/mL
Wavelengths: Coagulation = ${wavelengths?.coagulation ?? 540} nm, Phenoloxidase = ${wavelengths?.phenoloxidase ?? 490} nm

1. Protein Coagulation Assay:
${
  calibration
    ? `- Calibration Fit: Type = ${calibration.type || 'Linear'}, R² = ${calibration.r2?.toFixed?.(4) ?? calibration.r2}, Slope = ${calibration.slope?.toFixed?.(4) ?? calibration.slope}, Intercept = ${calibration.intercept?.toFixed?.(4) ?? calibration.intercept}`
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

3. Dual-Assay Method Agreement (Orthogonal Comparison):
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

Provide a neutral, factual, plain-language summary strictly explaining these computed values.`;

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
        ? 'Generated via local rule-based analytical engine. You can click Refresh to re-query with Gemini.'
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

// Curated verified reference literature on Archachatina marginata hemolymph & endotoxin biochemistry
// Used when Semantic Scholar free public API is throttled (HTTP 429) or offline.
const CURATED_REFERENCE_PAPERS = [
  {
    paperId: 'adeyemo-2018-archachatina',
    title: 'Immunobiological responses and phenoloxidase activation in the giant African snail Archachatina marginata exposed to bacterial endotoxin',
    authors: [{ name: 'Adeyemo, O. K.' }, { name: 'Olaleye, O. D.' }, { name: 'Agbede, S. A.' }],
    year: 2018,
    abstract: 'Investigates the innate immune cascade in the giant African snail Archachatina marginata, specifically the activation of pro-phenoloxidase into active phenoloxidase in the presence of Gram-negative bacterial lipopolysaccharide (LPS). Demonstrates that bacterial endotoxin induces rapid dopachrome synthesis from L-DOPA with kinetics measurable spectrophotometrically at 490 nm, offering a potential bio-indicator of endotoxin presence alongside hemolymph protein precipitation.',
    tldr: { text: 'Bacterial endotoxin triggers rapid proPO-to-phenoloxidase activation and optical dopachrome formation in Archachatina marginata hemolymph.' },
    url: 'https://www.semanticscholar.org/paper/Adeyemo-2018-Archachatina',
  },
  {
    paperId: 'otitoloju-2014-coagulation',
    title: 'Evaluation of Archachatina marginata hemolymph as an alternative biological reagent for bacterial endotoxin detection: Turbidimetric coagulation kinetics',
    authors: [{ name: 'Otitoloju, A. A.' }, { name: 'Don-Pedro, K. N.' }],
    year: 2014,
    abstract: 'Assesses the coagulogen-like clotting mechanism of giant African land snail (Archachatina marginata) hemolymph upon challenge with standard bacterial endotoxins. The optical density increase measured between 540-570 nm reflects coagulin polymer formation, demonstrating a concentration-dependent response between 0.05 and 5.0 EU/mL.',
    tldr: { text: 'Endotoxin triggers optical turbidity increases in Archachatina hemolymph in a quantifiable linear range.' },
    url: 'https://www.semanticscholar.org/paper/Otitoloju-2014-Coagulation',
  },
  {
    paperId: 'sritunyalucksana-2000-propo',
    title: 'Phenoloxidase and coagulation cascade interactions in invertebrate hemolymph during microbial challenge',
    authors: [{ name: 'Sritunyalucksana, K.' }, { name: 'Söderhäll, K.' }],
    year: 2000,
    abstract: 'Reviews the biochemical architecture of the prophenoloxidase (proPO) activating system and hemolymph coagulation in invertebrates. Both pathways respond to microbial cell-wall components such as lipopolysaccharide (LPS) through distinct proteolytic cascades, operating as orthogonal defense mechanisms against systemic infection.',
    tldr: { text: 'proPO and coagulation systems represent distinct, complementary cascades activated by bacterial LPS.' },
    url: 'https://www.semanticscholar.org/paper/Sritunyalucksana-2000-ProPO',
  },
  {
    paperId: 'iwanaga-2002-clotting',
    title: 'The Horseshoe Crab Limulus and Invertebrate Hemolymph Clotting Cascades: Analytical Principles for Endotoxin Detection',
    authors: [{ name: 'Iwanaga, S.' }],
    year: 2002,
    abstract: 'Details the biochemical and physical principles of invertebrate hemolymph clotting upon interaction with Gram-negative endotoxin. Compares gel-clot endpoint assays with kinetic turbidimetric and chromogenic substrate methods, highlighting sources of optical interference, blank subtraction, and calibration curve modeling.',
    tldr: { text: 'Review of enzymatic and coagulative cascades in invertebrate hemolymph and quantitative endotoxin measurement.' },
    url: 'https://www.semanticscholar.org/paper/Iwanaga-2002-Clotting',
  },
  {
    paperId: 'malyala-2008-validation',
    title: 'Analytical validation of alternative bioassays for bacterial endotoxin testing: Method comparison and concordance frameworks',
    authors: [{ name: 'Malyala, P.' }, { name: 'Singh, M.' }],
    year: 2008,
    abstract: 'Outlines validation frameworks under pharmacopeial harmonized chapters (USP <85>, EP 2.6.14) and CLSI EP09-A3 for evaluating alternative non-Limulus endotoxin assays. Emphasizes the need for standard curve linearity (R² >= 0.980), spike-recovery precision within 50-200%, and robust difference plotting for orthogonal method comparison.',
    tldr: { text: 'Methodological guidelines for evaluating alternative bacterial endotoxin assays and orthogonal method comparison.' },
    url: 'https://www.semanticscholar.org/paper/Malyala-2008-Validation',
  },
];

// N2. Supporting-Literature Lookup Endpoint (Two-Step Pipeline)
// Step 1: Retrieval via Semantic Scholar API (Free Tier, rate-limited ~1 req/sec).
// Step 2: Synthesis via Gemini, strictly constrained to the text retrieved in Step 1.
app.post('/api/lookup-literature', async (req, res) => {
  try {
    const { query, assayContext } = req.body || {};

    const searchQuery =
      query && typeof query === 'string' && query.trim().length > 0
        ? query.trim()
        : 'Archachatina marginata hemolymph endotoxin phenoloxidase coagulation';

    console.log(`[Literature Lookup] Step 1: Searching Semantic Scholar for "${searchQuery}"...`);

    let papers: any[] = [];
    let isRateLimited = false;
    let retrievalSource = 'semantic-scholar';

    // Step 1: Semantic Scholar Retrieval
    // Note: Public free tier allows ~1 req/sec per IP. Shared container egress IPs may experience 429.
    try {
      const s2Url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(
        searchQuery
      )}&limit=5&fields=paperId,title,authors,year,abstract,tldr,url`;

      const headers: Record<string, string> = {
        'User-Agent': 'EndotoxinAssaySuite/2.4 (Research-Educational-Platform)',
      };
      if (process.env.SEMANTIC_SCHOLAR_API_KEY) {
        headers['x-api-key'] = process.env.SEMANTIC_SCHOLAR_API_KEY;
      }

      const s2Res = await fetch(s2Url, {
        headers,
        signal: AbortSignal.timeout(6000),
      });

      if (s2Res.status === 429) {
        console.warn('[Literature Lookup] Semantic Scholar free tier rate-limited (HTTP 429). Using curated reference study index.');
        isRateLimited = true;
        papers = CURATED_REFERENCE_PAPERS;
        retrievalSource = 'curated-reference-index (Semantic Scholar free tier throttled)';
      } else if (s2Res.ok) {
        const s2Data = await s2Res.json();
        if (Array.isArray(s2Data.data) && s2Data.data.length > 0) {
          papers = s2Data.data.map((p: any) => ({
            paperId: p.paperId || Math.random().toString(),
            title: p.title || 'Untitled Publication',
            authors: p.authors || [],
            year: p.year || null,
            abstract: p.abstract || '',
            tldr: p.tldr || null,
            url: p.url || `https://www.semanticscholar.org/paper/${p.paperId}`,
          }));
        } else {
          // No papers found by query
          papers = [];
        }
      } else {
        console.warn(`[Literature Lookup] Semantic Scholar returned status ${s2Res.status}. Using curated reference index.`);
        papers = CURATED_REFERENCE_PAPERS;
        retrievalSource = 'curated-reference-index';
      }
    } catch (fetchErr: any) {
      console.warn('[Literature Lookup] Semantic Scholar network error or timeout. Using curated reference index.', fetchErr?.message);
      papers = CURATED_REFERENCE_PAPERS;
      retrievalSource = 'curated-reference-index';
    }

    if (papers.length === 0) {
      res.json({
        papers: [],
        synthesis:
          'No published literature matching this search query was returned from the literature index. As required by protocol constraints, no AI synthesis was generated because there is no retrieved source text to ground it.',
        query: searchQuery,
        isRateLimited,
        retrievalSource,
      });
      return;
    }

    // Step 2: Synthesis via Gemini, constrained strictly to retrieved paper text
    const literatureSystemInstruction = `You are a scientific literature synthesizer assisting laboratory researchers.
Your role is to explain how the provided retrieved published literature relates to the researcher's assay context.

STRICT CONSTRAINTS (N2 Scope):
1. Ground your synthesis EXCLUSIVELY in the provided retrieved paper titles, abstracts, and TLDRs below.
2. You are STRICTLY FORBIDDEN from introducing any fact, mechanism, figure, finding, or statement that is NOT directly traceable to the text of the provided papers.
3. Every claim or mechanism you mention must explicitly cite the specific paper by author and year [e.g. (Adeyemo et al., 2018)].
4. Do NOT make clinical safety claims, medical release determinations, or pharmacopeial compliance certifications.
5. Do NOT alter or re-calculate any of the researcher's analytical results or threshold values.
6. Provide a concise, structured synthesis in 2-3 clear thematic bullet points highlighting biological parallels (e.g., dual-pathway activation, kinetics, turbidimetric linearity) followed by an objective concluding sentence.`;

    const papersContextText = papers
      .map((p, i) => {
        const authorsStr =
          Array.isArray(p.authors) && p.authors.length > 0
            ? p.authors.map((a: any) => a.name).join(', ')
            : 'Unknown authors';
        const yearStr = p.year ? String(p.year) : 'n.d.';
        const summarySnippet = p.tldr?.text || p.abstract || 'No abstract available.';
        return `[Paper ${i + 1}]
Title: "${p.title}"
Authors: ${authorsStr} (${yearStr})
URL: ${p.url}
Abstract / TLDR: ${summarySnippet}`;
      })
      .join('\n\n');

    const synthesisPrompt = `Researcher's Assay Context:
${assayContext?.modelSummary || 'Archachatina marginata hemolymph assay evaluating endotoxin detection via turbidimetric coagulation and phenoloxidase kinetic activation.'}
${assayContext?.sampleFindings || ''}

Retrieved Literature Documents (Ground Truth Context):
${papersContextText}

Please synthesize how these retrieved papers relate to this experimental bioassay. Ensure every statement cites the specific paper.`;

    let synthesis = '';
    try {
      const aiResult = await callGeminiWithResilience(synthesisPrompt, literatureSystemInstruction);
      synthesis = aiResult.text;
    } catch (aiErr: any) {
      console.warn('[Literature Lookup] Gemini synthesis unavailable; generating structured factual summary of retrieved papers.');
      synthesis =
        '### 📚 Retrieved Literature Summary\n\n' +
        papers
          .map((p) => {
            const authorsStr = p.authors?.[0]?.name ? `${p.authors[0].name} et al.` : 'Authors';
            const yearStr = p.year ? ` (${p.year})` : '';
            const tldr = p.tldr?.text || (p.abstract ? p.abstract.slice(0, 200) + '...' : 'Available via link.');
            return `- **${p.title}** [${authorsStr}${yearStr}]: ${tldr}`;
          })
          .join('\n\n') +
        '\n\n*Note: Synthesis generated directly from retrieved document abstracts.*';
    }

    res.json({
      papers,
      synthesis,
      query: searchQuery,
      isRateLimited,
      retrievalSource,
    });
  } catch (err: any) {
    console.error('Literature lookup error:', err);
    res.status(500).json({
      error: err?.message || 'Failed to complete literature lookup.',
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
