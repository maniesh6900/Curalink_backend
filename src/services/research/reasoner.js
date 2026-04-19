import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";

const parseJson = (content) => {
  try {
    return JSON.parse(content);
  } catch {
    try {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
    } catch {}
    
    const data = {
      overview: content.slice(0, 500),
      researchInsights: [],
      clinicalTrials: [],
      personalizedTakeaway: "",
      safetyNotes: ["Response may be incomplete"]
    };
    return data;
  }
};

const buildFallback = ({ context, publications, trials }) => ({
  overview:
    `Evidence summary for ${context.disease || "the requested condition"} (extractive mode).`,
  fullOverview:
    `This summary is based on retrieved evidence for ${context.disease || "the requested condition"}. ` +
    `The AI response could not be generated, so the response is extractive rather than model-generated.`,
  researchInsights: publications.slice(0, 3).map((publication) => ({
    title: publication.title,
    insight:
      publication.abstract?.slice(0, 240) ||
      "Relevant publication retrieved, but the abstract was not available.",
  })),
  clinicalTrials: trials.slice(0, 3).map((trial) => ({
    title: trial.title,
    insight: `${trial.recruitingStatus}. ${trial.location || "Location not specified."}`,
  })),
  personalizedTakeaway:
    context.disease && context.intent
      ? `Focus the next search on ${context.intent} in the setting of ${context.disease}.`
      : "Refine the question with disease stage, treatment goal, or geography for better personalization.",
  safetyNotes: [
    "This prototype summarizes research and trial records, not personal medical advice.",
    "Treatment decisions should be reviewed with a licensed clinician.",
  ],
});

export const generateEvidenceSynthesis = async ({ context, conversation, publications, trials }) => {
  const prompt = [
    "You are a medical research assistant.",
    "Use only the supplied evidence. Do not invent findings or citations.",
    "Return valid JSON with this shape:",
    "{",
    '  "overview": string,',
    '  "researchInsights": [{"title": string, "insight": string}],',
    '  "clinicalTrials": [{"title": string, "insight": string}],',
    '  "personalizedTakeaway": string,',
    '  "safetyNotes": [string, string]',
    "}",
    "Keep the answer concise, source-grounded, and mention uncertainty where evidence is limited.",
    `Conversation context: ${JSON.stringify(conversation?.context ?? {})}`,
    `User request context: ${JSON.stringify(context)}`,
    `Top publications: ${JSON.stringify(publications.slice(0, 8))}`,
    `Top clinical trials: ${JSON.stringify(trials.slice(0, 4))}`,
  ].join("\n");

  try {
    const response = await fetch(env.aiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.AI_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      throw new ApiError(response.status, `AI request failed: ${response.statusText}`);
    }

    const payload = await response.json();
    let content = payload.choices?.[0]?.message?.content;
    
    if (!content && !payload.output?.text) {
      throw new ApiError(502, `AI returned unexpected format: ${JSON.stringify(payload).slice(0, 500)}`);
    }
    
    content = content || payload.output?.text;

    if (!content) {
      throw new ApiError(502, "AI returned an empty response");
    }

    let parsed;
    try {
      parsed = parseJson(content);
    } catch {
      parsed = {
        overview: content?.slice(0, 300) || "No content parsed",
        researchInsights: [],
        clinicalTrials: [],
        personalizedTakeaway: "",
        safetyNotes: []
      };
    }
    
    const summary = parsed.overview?.split(".")[0] + ".";
    
    return {
      overview: summary,
      fullOverview: parsed.overview,
      researchInsights: parsed.researchInsights ?? [],
      clinicalTrials: parsed.clinicalTrials ?? [],
      personalizedTakeaway: parsed.personalizedTakeaway ?? "",
      safetyNotes: parsed.safetyNotes ?? [],
      generator: process.env.AI_MODEL,
    };
  } catch (error) {
    const fb = buildFallback({ context, publications, trials });
    return {
      overview: fb.overview,
      fullOverview: fb.fullOverview,
      researchInsights: fb.researchInsights,
      clinicalTrials: fb.clinicalTrials,
      personalizedTakeaway: fb.personalizedTakeaway,
      safetyNotes: fb.safetyNotes,
      generator: "fallback",
      warning: error.message,
    };
  }
};
