// AI² Benchmark — TypeScript Types

export interface Model {
  id: string;
  display_name: string;
  provider: string;
  openrouter_id: string;
  config: Record<string, unknown>;
  arena_score: number;
  pricing: { input: number; output: number };
  context_window: number;
}

export interface Vote {
  stance: "FOR" | "AGAINST" | "UNDECIDED";
  confidence: number;
  reasoning: string;
  judge_model_id: string;
  persona: string;
  error?: boolean;
  parse_fallback?: boolean;
}

export interface VoteDetail {
  judge_model_id: string;
  persona: string;
  initial_stance: string;
  initial_confidence: number;
  final_stance: string;
  final_confidence: number;
  stance_changed: boolean;
  confidence_delta: number;
  is_self_judging: boolean;
  self_judging_side: string | null;
}

export interface DebateScore {
  winner_side: "FOR" | "AGAINST" | "TIE";
  winner_model_id: string | null;
  initial: {
    for: number;
    against: number;
    undecided: number;
    pct_for: number;
    pct_against: number;
  };
  final: {
    for: number;
    against: number;
    undecided: number;
    pct_for: number;
    pct_against: number;
  };
  delta_for: number;
  delta_against: number;
  confidence: {
    for_initial: number;
    for_final: number;
    against_initial: number;
    against_final: number;
  };
  persuasion_for: number;
  persuasion_against: number;
  vote_details: VoteDetail[];
}

export interface TranscriptEntry {
  phase: string;
  speaker: string;
  side: "FOR" | "AGAINST";
  content: string;
  type?: "question" | "answer" | "answers";
}

export interface DebateResult {
  debate_id: string;
  motion: string;
  model_for: { id: string; display_name: string };
  model_against: { id: string; display_name: string };
  transcript: TranscriptEntry[];
  initial_votes: Vote[];
  final_votes: Vote[];
  audience_questions: Array<{ question: string; judge_model_id: string; persona: string }>;
  score: DebateScore;
  metadata: {
    elapsed_seconds: number;
    timestamp: string;
  };
}

export interface LeaderboardEntry {
  rank: number;
  model_id: string;
  display_name: string;
  provider: string;
  elo: number;
  arena_score: number;
}

export interface EloHistoryEntry {
  debate_id: string;
  model_a: string;
  model_b: string;
  winner: string | null;
  elo_before: Record<string, number>;
  elo_after: Record<string, number>;
}

export interface JudgeSelfJudging {
  total: number;
  favored_self: number;
  self_bias_rate: number;
  votes: Array<{
    debate_for: string;
    debate_against: string;
    self_side: string;
    voted: string;
    favored_self: boolean;
  }>;
}

export interface JudgeStats {
  total_judgments: number;
  stance_flip_rate: number;
  avg_confidence_initial: number;
  avg_confidence_final: number;
  avg_confidence_delta: number;
  for_vote_pct: number;
  against_vote_pct: number;
  undecided_vote_pct: number;
  self_judging: JudgeSelfJudging;
}

export interface CrossModelEntry {
  favored: number;
  total: number;
  favor_rate: number;
}

export interface JudgeTendencies {
  per_judge: Record<string, JudgeStats>;
  cross_model_matrix: Record<string, Record<string, CrossModelEntry>>;
}

export interface DebateSummary {
  debate_id: string;
  motion: string;
  model_for: { id: string; display_name: string };
  model_against: { id: string; display_name: string };
  score: DebateScore;
  metadata: { elapsed_seconds: number; timestamp: string };
}

export interface BenchmarkData {
  leaderboard: LeaderboardEntry[];
  elo_history: EloHistoryEntry[];
  judge_tendencies: JudgeTendencies;
  total_debates: number;
  debates: DebateSummary[];
}

// Live debate arena types
export interface DebatePhaseEvent {
  phase: string;
  speaker?: string;
  side?: "FOR" | "AGAINST";
  content?: string;
  votes?: Vote[];
  score?: DebateScore;
  type?: string;
}
