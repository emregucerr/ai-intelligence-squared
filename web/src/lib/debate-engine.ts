import { Model } from "./types";
import { MODELS, PERSONA_MAP } from "./models";

const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";

interface ChatMessage {
  role: string;
  content: string;
}

export interface Vote {
  stance: string;
  confidence: number;
  reasoning: string;
  judge_model_id: string;
  persona: string;
}

export interface TranscriptEntry {
  phase: string;
  speaker: string;
  side: string;
  content: string;
  type?: string;
}

export interface DebateScore {
  winner_side: string;
  winner_model_id: string | null;
  delta_for: number;
  delta_against: number;
  initial: { for: number; against: number; undecided: number };
  final: { for: number; against: number; undecided: number };
}

export type DebateEvent =
  | { type: "phase"; phase: string }
  | { type: "transcript"; entry: TranscriptEntry }
  | { type: "initial_votes"; votes: Vote[] }
  | { type: "final_votes"; votes: Vote[] }
  | { type: "score"; score: DebateScore }
  | { type: "done" }
  | { type: "error"; message: string };

const PERSONA_DESCRIPTIONS: Record<string, string> = {
  "Risk-averse economist":
    "You are a risk-averse economist who prioritizes economic stability and empirical evidence.",
  "Philosophy professor":
    "You are a philosophy professor valuing logical consistency, moral frameworks, and intellectual rigor.",
  "Neutral academic":
    "You are a neutral academic researcher who prizes objectivity and peer-reviewed evidence.",
  "Contrarian thinker":
    "You are a contrarian thinker who questions conventional wisdom and values original thinking.",
  "Environmental activist":
    "You are an environmental activist who prioritizes ecological sustainability and social justice.",
  "Corporate executive":
    "You are a corporate executive who values practical outcomes, scalability, and innovation.",
  "Skeptical policymaker":
    "You are a skeptical policymaker who demands concrete, evidence-backed policy proposals.",
  "Optimistic technologist":
    "You are an optimistic technologist who believes in technology's transformative power.",
  "Union labor representative":
    "You are a union labor representative who prioritizes workers' rights and fair wages.",
  "Data scientist & AI researcher":
    "You are a data scientist who values quantitative evidence and technical precision.",
};

async function chatCompletion(
  apiKey: string,
  modelId: string,
  messages: ChatMessage[],
  maxTokens: number,
  config: Record<string, unknown> = {},
  responseFormat?: { type: string },
  signal?: AbortSignal
): Promise<string> {
  const payload: Record<string, unknown> = {
    model: modelId,
    messages,
    max_tokens: maxTokens,
    temperature: 0.7,
    ...config,
  };

  if (responseFormat) {
    payload.response_format = responseFormat;
  }

  const resp = await fetch(OPENROUTER_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "",
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(
      `API error ${resp.status}: ${err?.error?.message || JSON.stringify(err)}`
    );
  }

  const data = await resp.json();
  return data?.choices?.[0]?.message?.content || "";
}

export async function runDebate(
  apiKey: string,
  modelFor: Model,
  modelAgainst: Model,
  motion: string,
  onEvent: (event: DebateEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const debaterSystemFor = `You are a world-class debater arguing FOR the motion: "${motion}". Be logical, precise, and persuasive. Do not reveal you are an AI.`;
  const debaterSystemAgainst = `You are a world-class debater arguing AGAINST the motion: "${motion}". Be logical, precise, and persuasive. Do not reveal you are an AI.`;

  const transcript: TranscriptEntry[] = [];

  function formatTranscript() {
    return transcript
      .map((e) => `[${e.phase.toUpperCase()}] ${e.speaker} (${e.side}):\n${e.content}`)
      .join("\n\n---\n\n");
  }

  function call(
    modelOpenrouterId: string,
    messages: ChatMessage[],
    maxTokens: number,
    modelConfig: Record<string, unknown> = {},
    responseFormat?: { type: string }
  ) {
    return chatCompletion(apiKey, modelOpenrouterId, messages, maxTokens, modelConfig, responseFormat, signal);
  }

  // PHASE 1: Initial votes (all 10 judges in parallel)
  onEvent({ type: "phase", phase: "Collecting initial jury votes..." });

  const initialVotes = await Promise.all(
    MODELS.map(async (jm): Promise<Vote> => {
      const persona = PERSONA_MAP[jm.id] || "Neutral judge";
      const desc = PERSONA_DESCRIPTIONS[persona] || persona;
      try {
        const resp = await call(
          jm.openrouter_id,
          [
            {
              role: "system",
              content: `You are an independent judge. ${desc}\nMOTION: "${motion}"\nRespond with ONLY JSON: {"stance": "FOR" or "AGAINST" or "UNDECIDED", "confidence": 0-100, "reasoning": "brief"}`,
            },
            { role: "user", content: "Provide your initial stance on this motion." },
          ],
          200,
          jm.config,
          { type: "json_object" }
        );
        const parsed = JSON.parse(resp || "{}");
        return { stance: parsed.stance || "UNDECIDED", confidence: parsed.confidence || 50, reasoning: parsed.reasoning || "", judge_model_id: jm.id, persona };
      } catch {
        return { stance: "UNDECIDED", confidence: 50, reasoning: "Error", judge_model_id: jm.id, persona };
      }
    })
  );
  onEvent({ type: "initial_votes", votes: initialVotes });

  // PHASE 2: Opening statements (parallel)
  onEvent({ type: "phase", phase: "Opening Statements" });

  const [openingFor, openingAgainst] = await Promise.all([
    call(modelFor.openrouter_id, [
      { role: "system", content: debaterSystemFor },
      { role: "user", content: "Deliver your opening statement. Define your framing, establish key claims, and preempt opposing arguments. Do not reference your opponent." },
    ], 600, modelFor.config || {}),
    call(modelAgainst.openrouter_id, [
      { role: "system", content: debaterSystemAgainst },
      { role: "user", content: "Deliver your opening statement. Define your framing, establish key claims, and preempt opposing arguments. Do not reference your opponent." },
    ], 600, modelAgainst.config || {}),
  ]);

  transcript.push({ phase: "opening", speaker: modelFor.display_name, side: "FOR", content: openingFor });
  onEvent({ type: "transcript", entry: transcript[transcript.length - 1] });
  transcript.push({ phase: "opening", speaker: modelAgainst.display_name, side: "AGAINST", content: openingAgainst });
  onEvent({ type: "transcript", entry: transcript[transcript.length - 1] });

  // PHASE 3: Rebuttals (sequential — each needs the other's opening)
  onEvent({ type: "phase", phase: "Rebuttals" });

  const rebuttalFor = await call(modelFor.openrouter_id, [
    { role: "system", content: debaterSystemFor },
    { role: "user", content: `Your opponent's opening:\n\n${openingAgainst}\n\nDeliver your rebuttal. Reference their specific claims. Attack assumptions. Reframe the stakes.` },
  ], 500, modelFor.config || {});
  transcript.push({ phase: "rebuttal", speaker: modelFor.display_name, side: "FOR", content: rebuttalFor });
  onEvent({ type: "transcript", entry: transcript[transcript.length - 1] });

  const rebuttalAgainst = await call(modelAgainst.openrouter_id, [
    { role: "system", content: debaterSystemAgainst },
    { role: "user", content: `Your opponent's opening:\n\n${openingFor}\n\nDeliver your rebuttal. Reference their specific claims. Attack assumptions. Reframe the stakes.` },
  ], 500, modelAgainst.config || {});
  transcript.push({ phase: "rebuttal", speaker: modelAgainst.display_name, side: "AGAINST", content: rebuttalAgainst });
  onEvent({ type: "transcript", entry: transcript[transcript.length - 1] });

  // PHASE 4: Cross-Examination (3 rounds, sequential Q&A)
  for (let round = 1; round <= 3; round++) {
    onEvent({ type: "phase", phase: `Cross-Examination (Round ${round}/3)` });
    const tx = formatTranscript();

    const qFor = await call(modelFor.openrouter_id, [
      { role: "system", content: debaterSystemFor },
      { role: "user", content: `Transcript:\n${tx}\n\nAsk your opponent ONE pointed question targeting a weakness in their arguments.` },
    ], 150, modelFor.config || {});
    transcript.push({ phase: `cross_exam_r${round}`, speaker: modelFor.display_name, side: "FOR", content: qFor, type: "question" });
    onEvent({ type: "transcript", entry: transcript[transcript.length - 1] });

    const aAgainst = await call(modelAgainst.openrouter_id, [
      { role: "system", content: debaterSystemAgainst },
      { role: "user", content: `Question from opponent: ${qFor}\n\nAnswer directly. No dodging.` },
    ], 300, modelAgainst.config || {});
    transcript.push({ phase: `cross_exam_r${round}`, speaker: modelAgainst.display_name, side: "AGAINST", content: aAgainst, type: "answer" });
    onEvent({ type: "transcript", entry: transcript[transcript.length - 1] });

    const qAgainst = await call(modelAgainst.openrouter_id, [
      { role: "system", content: debaterSystemAgainst },
      { role: "user", content: `Transcript:\n${tx}\n\nAsk your opponent ONE pointed question targeting a weakness in their arguments.` },
    ], 150, modelAgainst.config || {});
    transcript.push({ phase: `cross_exam_r${round}`, speaker: modelAgainst.display_name, side: "AGAINST", content: qAgainst, type: "question" });
    onEvent({ type: "transcript", entry: transcript[transcript.length - 1] });

    const aFor = await call(modelFor.openrouter_id, [
      { role: "system", content: debaterSystemFor },
      { role: "user", content: `Question from opponent: ${qAgainst}\n\nAnswer directly. No dodging.` },
    ], 300, modelFor.config || {});
    transcript.push({ phase: `cross_exam_r${round}`, speaker: modelFor.display_name, side: "FOR", content: aFor, type: "answer" });
    onEvent({ type: "transcript", entry: transcript[transcript.length - 1] });
  }

  // PHASE 5: Closing statements (parallel)
  onEvent({ type: "phase", phase: "Closing Statements" });
  const tx = formatTranscript();

  const [closingFor, closingAgainst] = await Promise.all([
    call(modelFor.openrouter_id, [
      { role: "system", content: debaterSystemFor },
      { role: "user", content: `Transcript:\n${tx}\n\nClosing statement. No new arguments. Compress strongest points. Address biggest objection. Target undecided judges.` },
    ], 300, modelFor.config || {}),
    call(modelAgainst.openrouter_id, [
      { role: "system", content: debaterSystemAgainst },
      { role: "user", content: `Transcript:\n${tx}\n\nClosing statement. No new arguments. Compress strongest points. Address biggest objection. Target undecided judges.` },
    ], 300, modelAgainst.config || {}),
  ]);

  transcript.push({ phase: "closing", speaker: modelFor.display_name, side: "FOR", content: closingFor });
  onEvent({ type: "transcript", entry: transcript[transcript.length - 1] });
  transcript.push({ phase: "closing", speaker: modelAgainst.display_name, side: "AGAINST", content: closingAgainst });
  onEvent({ type: "transcript", entry: transcript[transcript.length - 1] });

  // PHASE 6: Final votes (all 10 judges in parallel)
  onEvent({ type: "phase", phase: "Collecting final jury votes..." });
  const fullTx = formatTranscript();

  const finalVotes = await Promise.all(
    MODELS.map(async (jm): Promise<Vote> => {
      const persona = PERSONA_MAP[jm.id] || "Neutral judge";
      const desc = PERSONA_DESCRIPTIONS[persona] || persona;
      try {
        const resp = await call(
          jm.openrouter_id,
          [
            {
              role: "system",
              content: `You are an independent judge. ${desc}\nMOTION: "${motion}"\nEvaluate fairly based on argument quality. Respond with ONLY JSON.`,
            },
            {
              role: "user",
              content: `DEBATE TRANSCRIPT:\n${fullTx}\n\nProvide your final vote: {"stance": "FOR" or "AGAINST" or "UNDECIDED", "confidence": 0-100, "reasoning": "brief"}`,
            },
          ],
          300,
          jm.config,
          { type: "json_object" }
        );
        const parsed = JSON.parse(resp || "{}");
        return { stance: parsed.stance || "UNDECIDED", confidence: parsed.confidence || 50, reasoning: parsed.reasoning || "", judge_model_id: jm.id, persona };
      } catch {
        return { stance: "UNDECIDED", confidence: 50, reasoning: "Error", judge_model_id: jm.id, persona };
      }
    })
  );
  onEvent({ type: "final_votes", votes: finalVotes });

  // Compute score
  const n = 10;
  const initFor = initialVotes.filter((v) => v.stance === "FOR").length;
  const initAgainst = initialVotes.filter((v) => v.stance === "AGAINST").length;
  const finFor = finalVotes.filter((v) => v.stance === "FOR").length;
  const finAgainst = finalVotes.filter((v) => v.stance === "AGAINST").length;

  const deltaFor = ((finFor - initFor) / n) * 100;
  const deltaAgainst = ((finAgainst - initAgainst) / n) * 100;

  const winnerSide = deltaFor > deltaAgainst ? "FOR" : deltaAgainst > deltaFor ? "AGAINST" : "TIE";
  const winnerModelId = winnerSide === "FOR" ? modelFor.id : winnerSide === "AGAINST" ? modelAgainst.id : null;

  onEvent({
    type: "score",
    score: {
      winner_side: winnerSide,
      winner_model_id: winnerModelId,
      delta_for: Math.round(deltaFor * 10) / 10,
      delta_against: Math.round(deltaAgainst * 10) / 10,
      initial: { for: initFor, against: initAgainst, undecided: n - initFor - initAgainst },
      final: { for: finFor, against: finAgainst, undecided: n - finFor - finAgainst },
    },
  });

  onEvent({ type: "done" });
}
