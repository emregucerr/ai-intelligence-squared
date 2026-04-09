// AI² Benchmark — Data Loading Layer
// Loads pre-computed benchmark results from JSON files

import { BenchmarkData, LeaderboardEntry, JudgeTendencies, DebateSummary } from "./types";
import { MODELS } from "./models";

// This will be populated from the benchmark results
// For now, we use placeholder data that gets overwritten when results are available
let _benchmarkData: BenchmarkData | null = null;

export function getBenchmarkData(): BenchmarkData {
  if (_benchmarkData) return _benchmarkData;

  try {
    // Load from the pre-built JSON file
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const raw = require("@/data/benchmark-results.json");
    // If the file has data, use it; otherwise fall back to placeholder
    if (raw && raw.leaderboard && raw.leaderboard.length > 0) {
      _benchmarkData = raw as BenchmarkData;
      return _benchmarkData;
    }
    return getPlaceholderData();
  } catch {
    // Return placeholder data
    return getPlaceholderData();
  }
}

function getPlaceholderData(): BenchmarkData {
  // Generate placeholder leaderboard based on arena scores
  const leaderboard: LeaderboardEntry[] = MODELS.map((m, i) => ({
    rank: i + 1,
    model_id: m.id,
    display_name: m.display_name,
    provider: m.provider,
    elo: 1500 + (MODELS.length - i) * 8, // Spread around 1500
    arena_score: m.arena_score,
  })).sort((a, b) => b.elo - a.elo);

  leaderboard.forEach((e, i) => (e.rank = i + 1));

  return {
    leaderboard,
    elo_history: [],
    judge_tendencies: {
      per_judge: {},
      cross_model_matrix: {},
    },
    total_debates: 0,
    debates: [],
  };
}

export function getLeaderboard(): LeaderboardEntry[] {
  return getBenchmarkData().leaderboard;
}

export function getJudgeTendencies(): JudgeTendencies {
  return getBenchmarkData().judge_tendencies;
}

export function getDebates(): DebateSummary[] {
  return getBenchmarkData().debates;
}

export function getModelStats(modelId: string) {
  const data = getBenchmarkData();
  const debates = data.debates.filter(
    (d) => d.model_for.id === modelId || d.model_against.id === modelId
  );

  const wins = debates.filter((d) => d.score.winner_model_id === modelId).length;
  const losses = debates.filter(
    (d) => d.score.winner_model_id !== null && d.score.winner_model_id !== modelId
  ).length;
  const ties = debates.filter((d) => d.score.winner_side === "TIE").length;

  // Average persuasion when this model debates
  let totalPersuasion = 0;
  let count = 0;
  for (const d of debates) {
    if (d.model_for.id === modelId) {
      totalPersuasion += d.score.persuasion_for;
    } else {
      totalPersuasion += d.score.persuasion_against;
    }
    count++;
  }

  return {
    wins,
    losses,
    ties,
    total_debates: debates.length,
    win_rate: debates.length > 0 ? Math.round((wins / debates.length) * 100) : 0,
    avg_persuasion: count > 0 ? Math.round(totalPersuasion / count) : 0,
  };
}
