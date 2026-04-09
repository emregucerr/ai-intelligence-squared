"use client";

import { LeaderboardEntry } from "@/lib/types";
import { PROVIDER_COLORS, getModelById, PERSONA_MAP } from "@/lib/models";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
  Zap,
  Shield,
} from "lucide-react";
import Link from "next/link";

interface Props {
  leaderboard: LeaderboardEntry[];
  modelStats?: Record<string, { wins: number; losses: number; ties: number; win_rate: number; avg_persuasion: number }>;
}

const rankIcons = [
  <Trophy key="1" className="h-5 w-5 text-yellow-400" />,
  <Trophy key="2" className="h-5 w-5 text-gray-300" />,
  <Trophy key="3" className="h-5 w-5 text-amber-600" />,
];

function getProviderIcon(provider: string) {
  switch (provider) {
    case "Anthropic":
      return <Brain className="h-4 w-4" />;
    case "Google":
      return <Zap className="h-4 w-4" />;
    case "xAI":
      return <Shield className="h-4 w-4" />;
    case "OpenAI":
      return <TrendingUp className="h-4 w-4" />;
    default:
      return null;
  }
}

export function LeaderboardTable({ leaderboard, modelStats }: Props) {
  const maxElo = Math.max(...leaderboard.map((e) => e.elo));
  const minElo = Math.min(...leaderboard.map((e) => e.elo));
  const eloRange = maxElo - minElo || 1;

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            <TableHead className="w-16 text-center">#</TableHead>
            <TableHead>Model</TableHead>
            <TableHead className="text-center">Provider</TableHead>
            <TableHead className="text-center">
              <span className="flex items-center justify-center gap-1">
                Debate ELO
              </span>
            </TableHead>
            <TableHead className="text-center">Arena Score</TableHead>
            <TableHead className="text-center">Win Rate</TableHead>
            <TableHead className="text-center">Persuasion</TableHead>
            <TableHead className="text-center">Judge Persona</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leaderboard.map((entry, idx) => {
            const model = getModelById(entry.model_id);
            const providerColor = PROVIDER_COLORS[entry.provider] || "#888";
            const stats = modelStats?.[entry.model_id];
            const eloBarWidth =
              ((entry.elo - minElo) / eloRange) * 100;
            const persona = PERSONA_MAP[entry.model_id] || "";

            return (
              <TableRow
                key={entry.model_id}
                className="border-border/30 hover:bg-accent/50 transition-colors group cursor-pointer"
                onClick={() => window.location.href = `/model/${entry.model_id}`}
              >
                {/* Rank */}
                <TableCell className="text-center font-bold text-lg">
                  {idx < 3 ? (
                    rankIcons[idx]
                  ) : (
                    <span className="text-muted-foreground">{entry.rank}</span>
                  )}
                </TableCell>

                {/* Model Name */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-8 rounded-full"
                      style={{ backgroundColor: providerColor }}
                    />
                    <div>
                      <div className="font-semibold text-sm group-hover:text-primary transition-colors">
                        {entry.display_name}
                      </div>
                      {model?.config && Object.keys(model.config).length > 0 && (
                        <Badge variant="outline" className="text-[10px] mt-0.5 px-1.5 py-0">
                          Extended Thinking
                        </Badge>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Provider */}
                <TableCell className="text-center">
                  <Badge
                    variant="secondary"
                    className="gap-1 text-xs"
                    style={{
                      borderColor: providerColor + "40",
                      color: providerColor,
                    }}
                  >
                    {getProviderIcon(entry.provider)}
                    {entry.provider}
                  </Badge>
                </TableCell>

                {/* ELO */}
                <TableCell className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-mono font-bold text-lg">
                      {Math.round(entry.elo)}
                    </span>
                    <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(5, eloBarWidth)}%`,
                          background: `linear-gradient(90deg, ${providerColor}80, ${providerColor})`,
                        }}
                      />
                    </div>
                  </div>
                </TableCell>

                {/* Arena Score */}
                <TableCell className="text-center">
                  <span className="text-muted-foreground font-mono text-sm">
                    {entry.arena_score}
                  </span>
                </TableCell>

                {/* Win Rate */}
                <TableCell className="text-center">
                  {stats ? (
                    <div className="flex items-center justify-center gap-1">
                      {stats.win_rate >= 60 ? (
                        <TrendingUp className="h-3 w-3 text-green-400" />
                      ) : stats.win_rate <= 40 ? (
                        <TrendingDown className="h-3 w-3 text-red-400" />
                      ) : (
                        <Minus className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span
                        className={`font-mono text-sm font-semibold ${
                          stats.win_rate >= 60
                            ? "text-green-400"
                            : stats.win_rate <= 40
                            ? "text-red-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {stats.win_rate}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>

                {/* Persuasion */}
                <TableCell className="text-center">
                  {stats ? (
                    <span
                      className={`font-mono text-sm ${
                        stats.avg_persuasion > 0
                          ? "text-green-400"
                          : stats.avg_persuasion < 0
                          ? "text-red-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {stats.avg_persuasion > 0 ? "+" : ""}
                      {stats.avg_persuasion}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>

                {/* Judge Persona */}
                <TableCell className="text-center">
                  <span className="text-xs text-muted-foreground italic">
                    {persona}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
