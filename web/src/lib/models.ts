// AI² Benchmark — Model Definitions (mirrors benchmark/models.py)

import { Model } from "./types";

export const MODELS: Model[] = [
  {
    id: "claude-opus-4.6-thinking",
    display_name: "Claude Opus 4.6 (Thinking)",
    provider: "Anthropic",
    openrouter_id: "anthropic/claude-opus-4.6",
    config: { reasoning: { effort: "high" } },
    arena_score: 1503,
    pricing: { input: 5.0, output: 25.0 },
    context_window: 1_000_000,
  },
  {
    id: "claude-opus-4.6",
    display_name: "Claude Opus 4.6",
    provider: "Anthropic",
    openrouter_id: "anthropic/claude-opus-4.6",
    config: {},
    arena_score: 1497,
    pricing: { input: 5.0, output: 25.0 },
    context_window: 1_000_000,
  },
  {
    id: "gemini-3.1-pro-preview",
    display_name: "Gemini 3.1 Pro Preview",
    provider: "Google",
    openrouter_id: "google/gemini-3.1-pro-preview",
    config: {},
    arena_score: 1493,
    pricing: { input: 2.0, output: 12.0 },
    context_window: 1_000_000,
  },
  {
    id: "grok-4.20",
    display_name: "Grok 4.20",
    provider: "xAI",
    openrouter_id: "x-ai/grok-4.20",
    config: {},
    arena_score: 1490,
    pricing: { input: 2.0, output: 6.0 },
    context_window: 2_000_000,
  },
  {
    id: "gemini-3-pro",
    display_name: "Gemini 3 Pro",
    provider: "Google",
    openrouter_id: "google/gemini-3-pro-image-preview",
    config: {},
    arena_score: 1486,
    pricing: { input: 2.0, output: 12.0 },
    context_window: 1_000_000,
  },
  {
    id: "gpt-5.4-high",
    display_name: "GPT-5.4 (High)",
    provider: "OpenAI",
    openrouter_id: "openai/gpt-5.4",
    config: { reasoning: { effort: "high" } },
    arena_score: 1484,
    pricing: { input: 2.5, output: 15.0 },
    context_window: 1_100_000,
  },
  {
    id: "grok-4.20-reasoning",
    display_name: "Grok 4.20 (Reasoning)",
    provider: "xAI",
    openrouter_id: "x-ai/grok-4.20",
    config: { reasoning: { effort: "high" } },
    arena_score: 1480,
    pricing: { input: 2.0, output: 6.0 },
    context_window: 2_000_000,
  },
  {
    id: "gpt-5.2-chat",
    display_name: "GPT-5.2 Chat",
    provider: "OpenAI",
    openrouter_id: "openai/gpt-5.2-chat",
    config: {},
    arena_score: 1477,
    pricing: { input: 1.75, output: 14.0 },
    context_window: 128_000,
  },
  {
    id: "grok-4.20-multi-agent",
    display_name: "Grok 4.20 Multi-Agent",
    provider: "xAI",
    openrouter_id: "x-ai/grok-4.20-multi-agent",
    config: {},
    arena_score: 1475,
    pricing: { input: 2.0, output: 6.0 },
    context_window: 2_000_000,
  },
  {
    id: "gemini-3-flash",
    display_name: "Gemini 3 Flash",
    provider: "Google",
    openrouter_id: "google/gemini-3-flash-preview",
    config: {},
    arena_score: 1474,
    pricing: { input: 0.5, output: 3.0 },
    context_window: 1_000_000,
  },
];

export const PERSONA_MAP: Record<string, string> = {
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

export const PROVIDER_COLORS: Record<string, string> = {
  Anthropic: "#D4A574",
  Google: "#4285F4",
  xAI: "#111111",
  OpenAI: "#10A37F",
};

export const PROVIDER_ICONS: Record<string, string> = {
  Anthropic: "/images/icon-anthropic.svg",
  Google: "/images/icon-google.svg",
  xAI: "/images/icon-xai.svg",
  OpenAI: "/images/icon-openai.svg",
};

export function getModelById(id: string): Model | undefined {
  return MODELS.find((m) => m.id === id);
}

export const DEBATE_TOPICS = [
  "This house believes AI will eliminate more jobs than it creates within the next decade.",
  "This house believes social media does more harm than good to democratic societies.",
  "This house believes space colonization should be humanity's top funding priority over climate change.",
  "This house believes universal basic income is both inevitable and desirable.",
  "This house believes open-source AI models are more beneficial to humanity than proprietary ones.",
];
