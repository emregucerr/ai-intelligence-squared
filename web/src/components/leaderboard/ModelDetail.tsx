"use client";

import { Model, DebateSummary, JudgeStats } from "@/lib/types";
import { PROVIDER_COLORS, PERSONA_MAP } from "@/lib/models";
import { ProviderIcon } from "@/components/ProviderIcon";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Trophy,
  Brain,
  Swords,
  TrendingUp,
  TrendingDown,
  Minus,
  Layers,
  Zap,
  ArrowRight,
  Shield,
} from "lucide-react";
import Link from "next/link";

interface Props {
  model: Model;
  stats: {
    wins: number;
    losses: number;
    ties: number;
    total_debates: number;
    win_rate: number;
    avg_persuasion: number;
  };
  debates: DebateSummary[];
  judgeProfile: JudgeStats | null;
  h2h: Record<
    string,
    { wins: number; losses: number; ties: number; opponent_name: string }
  >;
  elo: number;
  rank: number;
}

export function ModelDetail({
  model,
  stats,
  debates,
  judgeProfile,
  h2h,
  elo,
  rank,
}: Props) {
  const color = PROVIDER_COLORS[model.provider] || "#888";
  const persona = PERSONA_MAP[model.id] || "Unknown";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-5">
        <div className="shrink-0">
          <ProviderIcon provider={model.provider} size={64} className="rounded-lg" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold font-[family-name:var(--font-montserrat)]">{model.display_name}</h1>
            {rank > 0 && (
              <Badge
                variant="outline"
                className="text-sm px-2 py-0.5"
                style={{ borderColor: color + "40", color }}
              >
                #{rank}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Badge
              variant="secondary"
              className="gap-1.5 text-xs"
              style={{ color }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              {model.provider}
            </Badge>
            {Object.keys(model.config).length > 0 && (
              <Badge variant="outline" className="text-[10px]">
                Extended Thinking
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] italic text-muted-foreground">
              Judge persona: {persona}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            OpenRouter: <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">{model.openrouter_id}</code>
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <Trophy className="h-4 w-4 mx-auto mb-1 text-yellow-600" />
          <p className="text-xl font-bold font-mono">{Math.round(elo)}</p>
          <p className="text-[10px] text-muted-foreground">Debate ELO</p>
        </Card>
        <Card className="p-4 text-center">
          <TrendingUp className="h-4 w-4 mx-auto mb-1 text-green-600" />
          <p className="text-xl font-bold font-mono">{stats.win_rate}%</p>
          <p className="text-[10px] text-muted-foreground">
            Win Rate ({stats.wins}W-{stats.losses}L-{stats.ties}T)
          </p>
        </Card>
        <Card className="p-4 text-center">
          <Zap className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
          <p
            className={`text-xl font-bold font-mono ${
              stats.avg_persuasion > 0
                ? "text-green-600"
                : stats.avg_persuasion < 0
                ? "text-red-600"
                : ""
            }`}
          >
            {stats.avg_persuasion > 0 ? "+" : ""}
            {stats.avg_persuasion}
          </p>
          <p className="text-[10px] text-muted-foreground">Avg Persuasion</p>
        </Card>
        <Card className="p-4 text-center">
          <Brain className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xl font-bold font-mono">{model.arena_score}</p>
          <p className="text-[10px] text-muted-foreground">Arena Score</p>
        </Card>
      </div>

      {/* Model Info */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2 font-[family-name:var(--font-montserrat)]">
          <Layers className="h-4 w-4 text-muted-foreground" />
          Model Specs
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <p className="text-muted-foreground text-[10px]">Context Window</p>
            <p className="font-mono font-medium">
              {(model.context_window / 1_000_000).toFixed(1)}M tokens
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-[10px]">Input Price</p>
            <p className="font-mono font-medium">
              ${model.pricing.input}/M
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-[10px]">Output Price</p>
            <p className="font-mono font-medium">
              ${model.pricing.output}/M
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-[10px]">Config</p>
            <p className="font-mono font-medium text-[10px]">
              {Object.keys(model.config).length > 0
                ? JSON.stringify(model.config)
                : "Default"}
            </p>
          </div>
        </div>
      </Card>

      {/* Head-to-Head Record */}
      <div>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2 font-[family-name:var(--font-montserrat)]">
          <Swords className="h-4 w-4 text-muted-foreground" />
          Head-to-Head Record
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {Object.entries(h2h)
            .sort(
              ([, a], [, b]) =>
                b.wins - b.losses - (a.wins - a.losses)
            )
            .map(([opponentId, record]) => {
              const net = record.wins - record.losses;
              return (
                <Link
                  key={opponentId}
                  href={`/model/${opponentId}`}
                  className="block"
                >
                  <Card className="p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-medium truncate">
                          vs {record.opponent_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-xs font-mono font-semibold ${
                            net > 0
                              ? "text-green-600"
                              : net < 0
                              ? "text-red-600"
                              : "text-muted-foreground"
                          }`}
                        >
                          {record.wins}W-{record.losses}L
                          {record.ties > 0 ? `-${record.ties}T` : ""}
                        </span>
                        {net > 0 ? (
                          <TrendingUp className="h-3 w-3 text-green-600" />
                        ) : net < 0 ? (
                          <TrendingDown className="h-3 w-3 text-red-600" />
                        ) : (
                          <Minus className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
        </div>
      </div>

      {/* Judge Profile */}
      {judgeProfile && (
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2 font-[family-name:var(--font-montserrat)]">
            <Shield className="h-4 w-4 text-muted-foreground" />
            As a Judge ({persona})
          </h2>
          <Card className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-muted-foreground text-[10px]">Total Judgments</p>
                <p className="font-mono font-bold text-lg">
                  {judgeProfile.total_judgments}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px]">Stance Flip Rate</p>
                <p className="font-mono font-bold text-lg">
                  {judgeProfile.stance_flip_rate}%
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px]">Avg Confidence &Delta;</p>
                <p
                  className={`font-mono font-bold text-lg ${
                    judgeProfile.avg_confidence_delta > 0
                      ? "text-green-600"
                      : judgeProfile.avg_confidence_delta < 0
                      ? "text-red-600"
                      : ""
                  }`}
                >
                  {judgeProfile.avg_confidence_delta > 0 ? "+" : ""}
                  {judgeProfile.avg_confidence_delta}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px]">FOR Bias</p>
                <p className="font-mono font-bold text-lg">
                  {judgeProfile.for_vote_pct}%
                </p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground">Voting Distribution</p>
              <div className="flex h-3 rounded-sm overflow-hidden">
                <div
                  className="bg-primary/70 transition-all"
                  style={{ width: `${judgeProfile.for_vote_pct}%` }}
                  title={`FOR: ${judgeProfile.for_vote_pct}%`}
                />
                <div
                  className="bg-muted-foreground/30 transition-all"
                  style={{ width: `${judgeProfile.undecided_vote_pct}%` }}
                  title={`Undecided: ${judgeProfile.undecided_vote_pct}%`}
                />
                <div
                  className="bg-destructive/60 transition-all"
                  style={{ width: `${judgeProfile.against_vote_pct}%` }}
                  title={`AGAINST: ${judgeProfile.against_vote_pct}%`}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>FOR {judgeProfile.for_vote_pct}%</span>
                <span>Undecided {judgeProfile.undecided_vote_pct}%</span>
                <span>AGAINST {judgeProfile.against_vote_pct}%</span>
              </div>
            </div>

            {judgeProfile.self_judging.total > 0 && (
              <>
                <Separator className="my-4" />
                <div>
                  <p className="text-[10px] text-muted-foreground mb-2">Self-Judging Bias</p>
                  <div className="flex items-center gap-3">
                    <p className="text-xs">
                      When judging debates it was also participating in:{" "}
                      <span className="font-semibold">
                        voted for itself {judgeProfile.self_judging.favored_self}/
                        {judgeProfile.self_judging.total} times
                      </span>
                    </p>
                    <Badge
                      variant={
                        judgeProfile.self_judging.self_bias_rate > 60
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {judgeProfile.self_judging.self_bias_rate}% self-bias
                    </Badge>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {/* Debate History */}
      <div>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2 font-[family-name:var(--font-montserrat)]">
          <Swords className="h-4 w-4 text-muted-foreground" />
          Debate History ({debates.length})
        </h2>
        <div className="space-y-2">
          {debates.map((d) => {
            const isFor = d.model_for.id === model.id;
            const won = d.score.winner_model_id === model.id;
            const tied = d.score.winner_side === "TIE";
            const opponentName = isFor
              ? d.model_against.display_name
              : d.model_for.display_name;

            return (
              <Link
                key={d.debate_id}
                href={`/debate/${d.debate_id}`}
                className="block"
              >
                <Card className="p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {won ? (
                        <Trophy className="h-3.5 w-3.5 text-yellow-600 shrink-0" />
                      ) : tied ? (
                        <Minus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5 text-red-600 shrink-0" />
                      )}
                      <Badge
                        variant="outline"
                        className={`text-[9px] shrink-0 ${
                          isFor
                            ? "text-foreground border-primary/30"
                            : "text-muted-foreground border-destructive/30"
                        }`}
                      >
                        {isFor ? "FOR" : "AGAINST"}
                      </Badge>
                      <span className="text-xs truncate">
                        vs {opponentName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={won ? "default" : tied ? "secondary" : "outline"}
                        className="text-[10px]"
                      >
                        {won ? "WON" : tied ? "TIE" : "LOST"}
                      </Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 truncate italic pl-5">
                    {d.motion}
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
