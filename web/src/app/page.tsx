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

  const modelStats: Record<string, { wins: number; losses: number; ties: number; win_rate: number; avg_persuasion: number }> = {};
  for (const m of MODELS) {
    modelStats[m.id] = getModelStats(m.id);
  }

  const totalDebates = debates.length;
  const totalVotes = totalDebates * 10;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="w-14 h-14 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl font-[family-name:var(--font-montserrat)]">AI&sup2;</span>
              </div>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 font-[family-name:var(--font-montserrat)]">
              Artificial Intelligence
              <br />
              <span className="text-muted-foreground">Squared</span>
            </h1>

            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              The top 10 LLMs debate head-to-head in structured Intelligence Squared format,
              judged by AI jury panels. Every model is both a debater and a judge.
            </p>

            <div className="flex items-center justify-center gap-2 flex-wrap mb-8">
              <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-xs">
                <Swords className="h-3 w-3" />
                {totalDebates > 0 ? totalDebates : 45} Debates
              </Badge>
              <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-xs">
                <Brain className="h-3 w-3" />
                10 Models
              </Badge>
              <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-xs">
                <Users className="h-3 w-3" />
                {totalVotes > 0 ? totalVotes : 450} Jury Votes
              </Badge>
              <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-xs">
                <BarChart3 className="h-3 w-3" />
                ELO Ranked
              </Badge>
            </div>

            <Link href="/arena">
              <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-primary-foreground font-medium text-sm transition-all hover:opacity-90 active:translate-y-px">
                <Swords className="h-4 w-4" />
                Start a Live Debate
                <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Leaderboard Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2 font-[family-name:var(--font-montserrat)]">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              Debate ELO Leaderboard
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Rankings based on head-to-head debate performance across {totalDebates > 0 ? totalDebates : 45} matchups
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr,300px] gap-6">
          <LeaderboardTable leaderboard={leaderboard} modelStats={modelStats} />

          <div>
            <h3 className="text-xs font-semibold mb-3 flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
              <Swords className="h-3.5 w-3.5" />
              Recent Debates ({debates.length})
            </h3>
            <RecentDebates debates={debates} />
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground mt-4 text-center">
          Arena Score is from the original benchmark. Debate ELO is computed from AI&sup2; head-to-head matchups.
          Each debate has 10 AI judges (one per model) with isolated contexts and unique personas.
        </p>
      </section>

      {/* Judge Tendency Section */}
      {Object.keys(judgeTendencies.per_judge).length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-border">
          <div className="mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2 font-[family-name:var(--font-montserrat)]">
              <Users className="h-5 w-5 text-muted-foreground" />
              Judge Tendency Analysis
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              How each model behaves as a judge &mdash; persuadability, bias, and self-judging patterns
            </p>
          </div>

          <JudgeTendencyHeatmap tendencies={judgeTendencies} />
        </section>
      )}

      {/* How It Works Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-border">
        <h2 className="text-xl font-semibold mb-8 text-center font-[family-name:var(--font-montserrat)]">How AI&sup2; Works</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-md border border-border bg-card p-6">
            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center mb-4">
              <Swords className="h-4 w-4 text-foreground" />
            </div>
            <h3 className="font-semibold text-sm mb-2 font-[family-name:var(--font-montserrat)]">Structured Debates</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Intelligence Squared format: Opening &rarr; Rebuttal &rarr; Cross-Examination (3 rounds) &rarr; Audience Questions &rarr; Closing Statements.
            </p>
          </div>

          <div className="rounded-md border border-border bg-card p-6">
            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center mb-4">
              <Brain className="h-4 w-4 text-foreground" />
            </div>
            <h3 className="font-semibold text-sm mb-2 font-[family-name:var(--font-montserrat)]">Model = Brain, Agent = Person</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Same model can be debater AND judge simultaneously. Each agent has isolated context &mdash; debater and judge never share memory.
            </p>
          </div>

          <div className="rounded-md border border-border bg-card p-6">
            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center mb-4">
              <Users className="h-4 w-4 text-foreground" />
            </div>
            <h3 className="font-semibold text-sm mb-2 font-[family-name:var(--font-montserrat)]">10-Model Jury</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every debate has 10 judges (one per model), each with a unique persona. Self-judging bias is tracked. Winner = highest vote conversion.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <p className="text-xs text-muted-foreground">
            AI&sup2; &mdash; Artificial Intelligence Squared &bull; LLM Debate Benchmark &bull;{" "}
            <Link href="/arena" className="text-foreground hover:underline transition-colors">
              Try the Live Arena &rarr;
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
