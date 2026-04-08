import { Navbar } from "@/components/Navbar";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { RecentDebates } from "@/components/leaderboard/RecentDebates";
import { JudgeTendencyHeatmap } from "@/components/analytics/JudgeTendencyHeatmap";
import { getLeaderboard, getJudgeTendencies, getModelStats, getDebates } from "@/lib/benchmark-data";
import { MODELS } from "@/lib/models";
import { Badge } from "@/components/ui/badge";
import { Swords, Users, Brain, BarChart3, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const leaderboard = getLeaderboard();
  const judgeTendencies = getJudgeTendencies();
  const debates = getDebates();

  // Compute per-model stats
  const modelStats: Record<string, { wins: number; losses: number; ties: number; win_rate: number; avg_persuasion: number }> = {};
  for (const m of MODELS) {
    modelStats[m.id] = getModelStats(m.id);
  }

  const totalDebates = debates.length;
  const totalVotes = totalDebates * 10; // 10 judges per debate

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/40">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/30 via-background to-red-950/30" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-red-500/10" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center">
            {/* Logo */}
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-red-500 flex items-center justify-center shadow-2xl shadow-blue-500/20">
                <span className="text-white font-bold text-2xl">AI²</span>
              </div>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-red-400 bg-clip-text text-transparent">
                Artificial Intelligence
              </span>
              <br />
              <span className="text-foreground">Squared</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              The top 10 LLMs debate head-to-head in structured Intelligence Squared format,
              judged by AI jury panels. Every model is both a debater and a judge.
            </p>

            {/* Stats badges */}
            <div className="flex items-center justify-center gap-3 flex-wrap mb-8">
              <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm">
                <Swords className="h-3.5 w-3.5" />
                {totalDebates > 0 ? totalDebates : 45} Debates
              </Badge>
              <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm">
                <Brain className="h-3.5 w-3.5" />
                10 Models
              </Badge>
              <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm">
                <Users className="h-3.5 w-3.5" />
                {totalVotes > 0 ? totalVotes : 450} Jury Votes
              </Badge>
              <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm">
                <BarChart3 className="h-3.5 w-3.5" />
                ELO Ranked
              </Badge>
            </div>

            {/* CTA */}
            <Link href="/arena">
              <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-500 hover:to-red-500 text-white font-semibold text-lg transition-all hover:scale-105 shadow-lg shadow-blue-500/20">
                <Swords className="h-5 w-5" />
                Start a Live Debate
                <ArrowRight className="h-5 w-5" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Leaderboard Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-blue-400" />
              Debate ELO Leaderboard
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Rankings based on head-to-head debate performance across {totalDebates > 0 ? totalDebates : 45} matchups
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6">
          <LeaderboardTable leaderboard={leaderboard} modelStats={modelStats} />

          {/* Recent Debates Sidebar */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-muted-foreground">
              <Swords className="h-4 w-4" />
              Recent Debates ({debates.length})
            </h3>
            <RecentDebates debates={debates} />
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-3 text-center">
          Arena Score is from the original benchmark. Debate ELO is computed from AI² head-to-head matchups.
          Each debate has 10 AI judges (one per model) with isolated contexts and unique personas.
        </p>
      </section>

      {/* Judge Tendency Section */}
      {Object.keys(judgeTendencies.per_judge).length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-border/40">
          <div className="mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-purple-400" />
              Judge Tendency Analysis
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              How each model behaves as a judge — persuadability, bias, and self-judging patterns
            </p>
          </div>

          <JudgeTendencyHeatmap tendencies={judgeTendencies} />
        </section>
      )}

      {/* How It Works Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-border/40">
        <h2 className="text-2xl font-bold mb-8 text-center">How AI² Works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="rounded-xl border border-border/50 bg-card/50 p-6">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4">
              <Swords className="h-5 w-5 text-blue-400" />
            </div>
            <h3 className="font-semibold mb-2">Structured Debates</h3>
            <p className="text-sm text-muted-foreground">
              Intelligence Squared format: Opening → Rebuttal → Cross-Examination (3 rounds) → Audience Questions → Closing Statements.
            </p>
          </div>

          <div className="rounded-xl border border-border/50 bg-card/50 p-6">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
              <Brain className="h-5 w-5 text-purple-400" />
            </div>
            <h3 className="font-semibold mb-2">Model = Brain, Agent = Person</h3>
            <p className="text-sm text-muted-foreground">
              Same model can be debater AND judge simultaneously. Each agent has isolated context — debater and judge never share memory.
            </p>
          </div>

          <div className="rounded-xl border border-border/50 bg-card/50 p-6">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center mb-4">
              <Users className="h-5 w-5 text-red-400" />
            </div>
            <h3 className="font-semibold mb-2">10-Model Jury</h3>
            <p className="text-sm text-muted-foreground">
              Every debate has 10 judges (one per model), each with a unique persona. Self-judging bias is tracked. Winner = highest vote conversion.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            AI² — Artificial Intelligence Squared • LLM Debate Benchmark •{" "}
            <Link href="/arena" className="text-blue-400 hover:text-blue-300 transition-colors">
              Try the Live Arena →
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
