"use client";

import { Model, DebateSummary, JudgeStats } from "@/lib/types";
import { PROVIDER_COLORS, PERSONA_MAP, PROVIDER_ICONS } from "@/lib/models";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Trophy,
  Brain,
  Swords,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Layers,
  Zap,
  ArrowRight,
  Shield,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

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
  const iconPath = PROVIDER_ICONS[model.provider];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-6">
        {iconPath && (
          <div className="shrink-0">
            <Image
              src={iconPath}
              alt={model.provider}
              width={80}
              height={80}
              className="rounded-xl"
            />
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold">{model.display_name}</h1>
            {rank > 0 && (
              <Badge
                variant="outline"
                className="text-lg px-3 py-1"
                style={{ borderColor: color + "60", color }}
              >
                #{rank}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mb-3">
            <Badge
              variant="secondary"
              className="gap-1.5"
              style={{ borderColor: color + "40", color }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              {model.provider}
            </Badge>
            {Object.keys(model.config).length > 0 && (
              <Badge variant="outline" className="text-xs">
                Extended Thinking
              </Badge>
            )}
            <Badge variant="outline" className="text-xs italic text-muted-foreground">
              Judge persona: {persona}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            OpenRouter: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{model.openrouter_id}</code>
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <Trophy className="h-5 w-5 mx-auto mb-1 text-yellow-400" />
          <p className="text-2xl font-bold">{Math.round(elo)}</p>
          <p className="text-xs text-muted-foreground">Debate ELO</p>
        </Card>
        <Card className="p-4 text-center">
          <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-400" />
          <p className="text-2xl font-bold">{stats.win_rate}%</p>
          <p className="text-xs text-muted-foreground">
            Win Rate ({stats.wins}W-{stats.losses}L-{stats.ties}T)
          </p>
        </Card>
        <Card className="p-4 text-center">
          <Zap className="h-5 w-5 mx-auto mb-1 text-blue-400" />
          <p
            className={`text-2xl font-bold ${
              stats.avg_persuasion > 0
                ? "text-green-400"
                : stats.avg_persuasion < 0
                ? "text-red-400"
                : ""
            }`}
          >
            {stats.avg_persuasion > 0 ? "+" : ""}
            {stats.avg_persuasion}
          </p>
          <p className="text-xs text-muted-foreground">Avg Persuasion</p>
        </Card>
        <Card className="p-4 text-center">
          <Brain className="h-5 w-5 mx-auto mb-1 text-purple-400" />
          <p className="text-2xl font-bold">{model.arena_score}</p>
          <p className="text-xs text-muted-foreground">Arena Score</p>
        </Card>
      </div>

      {/* Model Info */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Layers className="h-5 w-5 text-muted-foreground" />
          Model Specs
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Context Window</p>
            <p className="font-mono font-semibold">
              {(model.context_window / 1_000_000).toFixed(1)}M tokens
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Input Price</p>
            <p className="font-mono font-semibold">
              ${model.pricing.input}/M
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Output Price</p>
            <p className="font-mono font-semibold">
              ${model.pricing.output}/M
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Config</p>
            <p className="font-mono font-semibold text-xs">
              {Object.keys(model.config).length > 0
                ? JSON.stringify(model.config)
                : "Default"}
            </p>
          </div>
        </div>
      </Card>

      {/* Head-to-Head Record */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Swords className="h-5 w-5 text-blue-400" />
          Head-to-Head Record
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                  <Card className="p-3 hover:bg-accent/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium truncate">
                          vs {record.opponent_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-sm font-mono font-bold ${
                            net > 0
                              ? "text-green-400"
                              : net < 0
                              ? "text-red-400"
                              : "text-muted-foreground"
                          }`}
                        >
                          {record.wins}W-{record.losses}L
                          {record.ties > 0 ? `-${record.ties}T` : ""}
                        </span>
                        {net > 0 ? (
                          <TrendingUp className="h-3 w-3 text-green-400" />
                        ) : net < 0 ? (
                          <TrendingDown className="h-3 w-3 text-red-400" />
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
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-400" />
            As a Judge ({persona})
          </h2>
          <Card className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Total Judgments</p>
                <p className="font-mono font-bold text-xl">
                  {judgeProfile.total_judgments}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Stance Flip Rate</p>
                <p className="font-mono font-bold text-xl">
                  {judgeProfile.stance_flip_rate}%
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Avg Confidence Δ</p>
                <p
                  className={`font-mono font-bold text-xl ${
                    judgeProfile.avg_confidence_delta > 0
                      ? "text-green-400"
                      : judgeProfile.avg_confidence_delta < 0
                      ? "text-red-400"
                      : ""
                  }`}
                >
                  {judgeProfile.avg_confidence_delta > 0 ? "+" : ""}
                  {judgeProfile.avg_confidence_delta}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">FOR Bias</p>
                <p className="font-mono font-bold text-xl text-blue-400">
                  {judgeProfile.for_vote_pct}%
                </p>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Voting breakdown bar */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Voting Distribution</p>
              <div className="flex h-4 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 transition-all"
                  style={{ width: `${judgeProfile.for_vote_pct}%` }}
                  title={`FOR: ${judgeProfile.for_vote_pct}%`}
                />
                <div
                  className="bg-gray-500 transition-all"
                  style={{ width: `${judgeProfile.undecided_vote_pct}%` }}
                  title={`Undecided: ${judgeProfile.undecided_vote_pct}%`}
                />
                <div
                  className="bg-red-500 transition-all"
                  style={{ width: `${judgeProfile.against_vote_pct}%` }}
                  title={`AGAINST: ${judgeProfile.against_vote_pct}%`}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span className="text-blue-400">FOR {judgeProfile.for_vote_pct}%</span>
                <span>Undecided {judgeProfile.undecided_vote_pct}%</span>
                <span className="text-red-400">AGAINST {judgeProfile.against_vote_pct}%</span>
              </div>
            </div>

            {/* Self-judging */}
            {judgeProfile.self_judging.total > 0 && (
              <>
                <Separator className="my-4" />
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Self-Judging Bias</p>
                  <div className="flex items-center gap-3">
                    <p className="text-sm">
                      When judging debates it was also participating in:{" "}
                      <span className="font-bold">
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
                      {judgeProfile.self_judging.self_bias_rate > 60 ? " ⚠️" : ""}
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
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Swords className="h-5 w-5 text-muted-foreground" />
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
                <Card className="p-3 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {won ? (
                        <Trophy className="h-4 w-4 text-yellow-400 shrink-0" />
                      ) : tied ? (
                        <Minus className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-400 shrink-0" />
                      )}
                      <Badge
                        variant="outline"
                        className={`text-[10px] shrink-0 ${
                          isFor
                            ? "text-blue-400 border-blue-500/50"
                            : "text-red-400 border-red-500/50"
                        }`}
                      >
                        {isFor ? "FOR" : "AGAINST"}
                      </Badge>
                      <span className="text-sm truncate">
                        vs {opponentName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={won ? "default" : tied ? "secondary" : "outline"}
                        className="text-xs"
                      >
                        {won ? "WON" : tied ? "TIE" : "LOST"}
                      </Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 truncate italic pl-6">
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
