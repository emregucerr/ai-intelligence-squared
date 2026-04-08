import { Navbar } from "@/components/Navbar";
import { ModelDetail } from "@/components/leaderboard/ModelDetail";
import { notFound } from "next/navigation";
import { MODELS } from "@/lib/models";
import { getBenchmarkData, getModelStats } from "@/lib/benchmark-data";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ModelDetailPage({ params }: Props) {
  const { id } = await params;
  const model = MODELS.find((m) => m.id === id);

  if (!model) {
    notFound();
  }

  const data = getBenchmarkData();
  const stats = getModelStats(id);

  // Get debates involving this model
  const debates = data.debates.filter(
    (d) => d.model_for.id === id || d.model_against.id === id
  );

  // Get judge tendencies for this model
  const judgeProfile = data.judge_tendencies?.per_judge?.[id] || null;

  // Build head-to-head record
  const h2h: Record<
    string,
    { wins: number; losses: number; ties: number; opponent_name: string }
  > = {};
  for (const d of debates) {
    const isFor = d.model_for.id === id;
    const opponentId = isFor ? d.model_against.id : d.model_for.id;
    const opponentName = isFor
      ? d.model_against.display_name
      : d.model_for.display_name;

    if (!h2h[opponentId]) {
      h2h[opponentId] = { wins: 0, losses: 0, ties: 0, opponent_name: opponentName };
    }

    if (d.score.winner_side === "TIE") {
      h2h[opponentId].ties++;
    } else if (d.score.winner_model_id === id) {
      h2h[opponentId].wins++;
    } else {
      h2h[opponentId].losses++;
    }
  }

  // Get the ELO for this model
  const leaderboardEntry = data.leaderboard.find((e) => e.model_id === id);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ModelDetail
          model={model}
          stats={stats}
          debates={debates}
          judgeProfile={judgeProfile}
          h2h={h2h}
          elo={leaderboardEntry?.elo ?? 1500}
          rank={leaderboardEntry?.rank ?? 0}
        />
      </div>
    </div>
  );
}

export function generateStaticParams() {
  return MODELS.map((m) => ({ id: m.id }));
}
