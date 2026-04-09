import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 800;
export const dynamic = "force-dynamic";

const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";

interface ChatMessage {
  role: string;
  content: string;
}

async function chatCompletion(
  apiKey: string,
  modelId: string,
  messages: ChatMessage[],
  maxTokens: number,
  config: Record<string, unknown> = {},
  responseFormat?: { type: string }
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
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(
      `API error ${resp.status}: ${
        err?.error?.message || JSON.stringify(err)
      }`
    );
  }

  const data = await resp.json();
  return data?.choices?.[0]?.message?.content || "";
}

// Judge personas (same as benchmark)
const PERSONA_MAP: Record<string, string> = {
  "claude-opus-4.6-thinking": "Risk-averse economist",
  "claude-opus-4.6": "Philosophy professor",
  "gemini-3.1-pro-preview": "Neutral academic",
  "grok-4.20": "Contrarian thinker",
  "gemini-3-pro": "Environmental activist",
  "gpt-5.4-high": "Corporate executive",
  "grok-4.20-reasoning": "Skeptical policymaker",
  "gpt-5.2-chat": "Optimistic technologist",
  "grok-4.20-multi-agent": "Union labor representative",
  "gemini-3-flash": "Data scientist & AI researcher",
};

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

interface ModelConfig {
  id: string;
  display_name: string;
  openrouter_id: string;
  config: Record<string, unknown>;
}

// Import all models info for jury
const ALL_MODELS: ModelConfig[] = [
  { id: "claude-opus-4.6-thinking", display_name: "Claude Opus 4.6 (Thinking)", openrouter_id: "anthropic/claude-opus-4.6", config: { reasoning: { effort: "high" } } },
  { id: "claude-opus-4.6", display_name: "Claude Opus 4.6", openrouter_id: "anthropic/claude-opus-4.6", config: {} },
  { id: "gemini-3.1-pro-preview", display_name: "Gemini 3.1 Pro Preview", openrouter_id: "google/gemini-3.1-pro-preview", config: {} },
  { id: "grok-4.20", display_name: "Grok 4.20", openrouter_id: "x-ai/grok-4.20", config: {} },
  { id: "gemini-3-pro", display_name: "Gemini 3 Pro", openrouter_id: "google/gemini-3-pro-image-preview", config: {} },
  { id: "gpt-5.4-high", display_name: "GPT-5.4 (High)", openrouter_id: "openai/gpt-5.4", config: { reasoning: { effort: "high" } } },
  { id: "grok-4.20-reasoning", display_name: "Grok 4.20 (Reasoning)", openrouter_id: "x-ai/grok-4.20", config: { reasoning: { effort: "high" } } },
  { id: "gpt-5.2-chat", display_name: "GPT-5.2 Chat", openrouter_id: "openai/gpt-5.2-chat", config: {} },
  { id: "grok-4.20-multi-agent", display_name: "Grok 4.20 Multi-Agent", openrouter_id: "x-ai/grok-4.20-multi-agent", config: {} },
  { id: "gemini-3-flash", display_name: "Gemini 3 Flash", openrouter_id: "google/gemini-3-flash-preview", config: {} },
];

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { model_for, model_against, motion, api_key } = body;

  if (!api_key) {
    return new Response(JSON.stringify({ error: "API key required" }), {
      status: 400,
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      }

      try {
        const debaterSystemFor = `You are a world-class debater arguing FOR the motion: "${motion}". Be logical, precise, and persuasive. Do not reveal you are an AI.`;
        const debaterSystemAgainst = `You are a world-class debater arguing AGAINST the motion: "${motion}". Be logical, precise, and persuasive. Do not reveal you are an AI.`;

        const transcript: Array<{
          phase: string;
          speaker: string;
          side: string;
          content: string;
          type?: string;
        }> = [];

        function formatTranscript() {
          return transcript
            .map((e) => `[${e.phase.toUpperCase()}] ${e.speaker} (${e.side}):\n${e.content}`)
            .join("\n\n---\n\n");
        }

        // PHASE 1: Initial votes
        send({ phase: "Collecting initial jury votes...", type: "phase" });

        const votePromises = ALL_MODELS.map(async (jm) => {
          const persona = PERSONA_MAP[jm.id] || "Neutral judge";
          const desc = PERSONA_DESCRIPTIONS[persona] || persona;
          try {
            const resp = await chatCompletion(
              api_key,
              jm.openrouter_id,
              [
                {
                  role: "system",
                  content: `You are an independent judge. ${desc}\nMOTION: "${motion}"\nRespond with ONLY JSON: {"stance": "FOR" or "AGAINST" or "UNDECIDED", "confidence": 0-100, "reasoning": "brief"}`,
                },
                {
                  role: "user",
                  content: "Provide your initial stance on this motion.",
                },
              ],
              200,
              jm.config,
              { type: "json_object" }
            );
            const parsed = JSON.parse(resp || "{}");
            return {
              stance: parsed.stance || "UNDECIDED",
              confidence: parsed.confidence || 50,
              reasoning: parsed.reasoning || "",
              judge_model_id: jm.id,
              persona,
            };
          } catch {
            return {
              stance: "UNDECIDED",
              confidence: 50,
              reasoning: "Error",
              judge_model_id: jm.id,
              persona,
            };
          }
        });

        const initialVotes = await Promise.all(votePromises);
        send({ type: "initial_votes", votes: initialVotes });

        // PHASE 2: Opening statements
        send({ phase: "Opening Statements", type: "phase" });

        const [openingFor, openingAgainst] = await Promise.all([
          chatCompletion(
            api_key,
            model_for.openrouter_id,
            [
              { role: "system", content: debaterSystemFor },
              {
                role: "user",
                content:
                  "Deliver your opening statement. Define your framing, establish key claims, and preempt opposing arguments. Do not reference your opponent.",
              },
            ],
            600,
            model_for.config || {}
          ),
          chatCompletion(
            api_key,
            model_against.openrouter_id,
            [
              { role: "system", content: debaterSystemAgainst },
              {
                role: "user",
                content:
                  "Deliver your opening statement. Define your framing, establish key claims, and preempt opposing arguments. Do not reference your opponent.",
              },
            ],
            600,
            model_against.config || {}
          ),
        ]);

        transcript.push({
          phase: "opening",
          speaker: model_for.display_name,
          side: "FOR",
          content: openingFor,
        });
        send({
          type: "transcript",
          entry: transcript[transcript.length - 1],
        });

        transcript.push({
          phase: "opening",
          speaker: model_against.display_name,
          side: "AGAINST",
          content: openingAgainst,
        });
        send({
          type: "transcript",
          entry: transcript[transcript.length - 1],
        });

        // PHASE 3: Rebuttals
        send({ phase: "Rebuttals", type: "phase" });

        const rebuttalFor = await chatCompletion(
          api_key,
          model_for.openrouter_id,
          [
            { role: "system", content: debaterSystemFor },
            {
              role: "user",
              content: `Your opponent's opening:\n\n${openingAgainst}\n\nDeliver your rebuttal. Reference their specific claims. Attack assumptions. Reframe the stakes.`,
            },
          ],
          500,
          model_for.config || {}
        );

        transcript.push({
          phase: "rebuttal",
          speaker: model_for.display_name,
          side: "FOR",
          content: rebuttalFor,
        });
        send({
          type: "transcript",
          entry: transcript[transcript.length - 1],
        });

        const rebuttalAgainst = await chatCompletion(
          api_key,
          model_against.openrouter_id,
          [
            { role: "system", content: debaterSystemAgainst },
            {
              role: "user",
              content: `Your opponent's opening:\n\n${openingFor}\n\nDeliver your rebuttal. Reference their specific claims. Attack assumptions. Reframe the stakes.`,
            },
          ],
          500,
          model_against.config || {}
        );

        transcript.push({
          phase: "rebuttal",
          speaker: model_against.display_name,
          side: "AGAINST",
          content: rebuttalAgainst,
        });
        send({
          type: "transcript",
          entry: transcript[transcript.length - 1],
        });

        // PHASE 4: Cross-Examination (3 rounds)
        for (let round = 1; round <= 3; round++) {
          send({
            phase: `Cross-Examination (Round ${round}/3)`,
            type: "phase",
          });
          const tx = formatTranscript();

          // FOR asks
          const qFor = await chatCompletion(
            api_key,
            model_for.openrouter_id,
            [
              { role: "system", content: debaterSystemFor },
              {
                role: "user",
                content: `Transcript:\n${tx}\n\nAsk your opponent ONE pointed question targeting a weakness in their arguments.`,
              },
            ],
            150,
            model_for.config || {}
          );
          transcript.push({
            phase: `cross_exam_r${round}`,
            speaker: model_for.display_name,
            side: "FOR",
            content: qFor,
            type: "question",
          });
          send({
            type: "transcript",
            entry: transcript[transcript.length - 1],
          });

          // AGAINST answers
          const aAgainst = await chatCompletion(
            api_key,
            model_against.openrouter_id,
            [
              { role: "system", content: debaterSystemAgainst },
              {
                role: "user",
                content: `Question from opponent: ${qFor}\n\nAnswer directly. No dodging.`,
              },
            ],
            300,
            model_against.config || {}
          );
          transcript.push({
            phase: `cross_exam_r${round}`,
            speaker: model_against.display_name,
            side: "AGAINST",
            content: aAgainst,
            type: "answer",
          });
          send({
            type: "transcript",
            entry: transcript[transcript.length - 1],
          });

          // AGAINST asks
          const qAgainst = await chatCompletion(
            api_key,
            model_against.openrouter_id,
            [
              { role: "system", content: debaterSystemAgainst },
              {
                role: "user",
                content: `Transcript:\n${tx}\n\nAsk your opponent ONE pointed question targeting a weakness in their arguments.`,
              },
            ],
            150,
            model_against.config || {}
          );
          transcript.push({
            phase: `cross_exam_r${round}`,
            speaker: model_against.display_name,
            side: "AGAINST",
            content: qAgainst,
            type: "question",
          });
          send({
            type: "transcript",
            entry: transcript[transcript.length - 1],
          });

          // FOR answers
          const aFor = await chatCompletion(
            api_key,
            model_for.openrouter_id,
            [
              { role: "system", content: debaterSystemFor },
              {
                role: "user",
                content: `Question from opponent: ${qAgainst}\n\nAnswer directly. No dodging.`,
              },
            ],
            300,
            model_for.config || {}
          );
          transcript.push({
            phase: `cross_exam_r${round}`,
            speaker: model_for.display_name,
            side: "FOR",
            content: aFor,
            type: "answer",
          });
          send({
            type: "transcript",
            entry: transcript[transcript.length - 1],
          });
        }

        // PHASE 5: Closing statements
        send({ phase: "Closing Statements", type: "phase" });
        const tx = formatTranscript();

        const [closingFor, closingAgainst] = await Promise.all([
          chatCompletion(
            api_key,
            model_for.openrouter_id,
            [
              { role: "system", content: debaterSystemFor },
              {
                role: "user",
                content: `Transcript:\n${tx}\n\nClosing statement. No new arguments. Compress strongest points. Address biggest objection. Target undecided judges.`,
              },
            ],
            300,
            model_for.config || {}
          ),
          chatCompletion(
            api_key,
            model_against.openrouter_id,
            [
              { role: "system", content: debaterSystemAgainst },
              {
                role: "user",
                content: `Transcript:\n${tx}\n\nClosing statement. No new arguments. Compress strongest points. Address biggest objection. Target undecided judges.`,
              },
            ],
            300,
            model_against.config || {}
          ),
        ]);

        transcript.push({
          phase: "closing",
          speaker: model_for.display_name,
          side: "FOR",
          content: closingFor,
        });
        send({
          type: "transcript",
          entry: transcript[transcript.length - 1],
        });
        transcript.push({
          phase: "closing",
          speaker: model_against.display_name,
          side: "AGAINST",
          content: closingAgainst,
        });
        send({
          type: "transcript",
          entry: transcript[transcript.length - 1],
        });

        // PHASE 6: Final votes
        send({ phase: "Collecting final jury votes...", type: "phase" });
        const fullTx = formatTranscript();

        const finalVotePromises = ALL_MODELS.map(async (jm) => {
          const persona = PERSONA_MAP[jm.id] || "Neutral judge";
          const desc = PERSONA_DESCRIPTIONS[persona] || persona;
          try {
            const resp = await chatCompletion(
              api_key,
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
            return {
              stance: parsed.stance || "UNDECIDED",
              confidence: parsed.confidence || 50,
              reasoning: parsed.reasoning || "",
              judge_model_id: jm.id,
              persona,
            };
          } catch {
            return {
              stance: "UNDECIDED",
              confidence: 50,
              reasoning: "Error",
              judge_model_id: jm.id,
              persona,
            };
          }
        });

        const finalVotes = await Promise.all(finalVotePromises);
        send({ type: "final_votes", votes: finalVotes });

        // Compute score
        const n = 10;
        const initFor = initialVotes.filter((v) => v.stance === "FOR").length;
        const initAgainst = initialVotes.filter((v) => v.stance === "AGAINST").length;
        const finFor = finalVotes.filter((v) => v.stance === "FOR").length;
        const finAgainst = finalVotes.filter((v) => v.stance === "AGAINST").length;

        const deltaFor = ((finFor - initFor) / n) * 100;
        const deltaAgainst = ((finAgainst - initAgainst) / n) * 100;

        const winnerSide =
          deltaFor > deltaAgainst ? "FOR" : deltaAgainst > deltaFor ? "AGAINST" : "TIE";
        const winnerModelId =
          winnerSide === "FOR"
            ? model_for.id
            : winnerSide === "AGAINST"
            ? model_against.id
            : null;

        send({
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

        send({ type: "done" });
      } catch (err) {
        send({
          type: "error",
          message: (err as Error).message || "Unknown error",
        });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
