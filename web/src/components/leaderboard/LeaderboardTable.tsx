"use client";

import { LeaderboardEntry } from "@/lib/types";
import { PROVIDER_COLORS, getModelById, PERSONA_MAP } from "@/lib/models";
import { ProviderIcon } from "@/components/ProviderIcon";
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
} from "lucide-react";

interface Props {
  leaderboard: LeaderboardEntry[];
  modelStats?: Record<string, { wins: number; losses: number; ties: number; win_rate: number; avg_persuasion: number }>;
}

const rankDisplay = (idx: number, rank: number) => {
  if (idx === 0) return <Trophy className="h-4 w-4 text-yellow-600" />;
  if (idx === 1) return <Trophy className="h-4 w-4 text-gray-400" />;
  if (idx === 2) return <Trophy className="h-4 w-4 text-amber-700" />;
  return <span className="text-muted-foreground text-sm">{rank}</span>;
};

export function LeaderboardTable({ leaderboard, modelStats }: Props) {
  const maxElo = Math.max(...leaderboard.map((e) => e.elo));
  const minElo = Math.min(...leaderboard.map((e) => e.elo));
  const eloRange = maxElo - minElo || 1;

  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="w-12 text-center text-xs">#</TableHead>
            <TableHead className="text-xs">Model</TableHead>
            <TableHead className="text-center text-xs">Provider</TableHead>
            <TableHead className="text-center text-xs">Debate ELO</TableHead>
            <TableHead className="text-center text-xs">Arena Score</TableHead>
            <TableHead className="text-center text-xs">Win Rate</TableHead>
            <TableHead className="text-center text-xs">Persuasion</TableHead>
            <TableHead className="text-center text-xs">Judge Persona</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leaderboard.map((entry, idx) => {
            const model = getModelById(entry.model_id);
            const providerColor = PROVIDER_COLORS[entry.provider] || "#888";
            const stats = modelStats?.[entry.model_id];
            const eloBarWidth = ((entry.elo - minElo) / eloRange) * 100;
            const persona = PERSONA_MAP[entry.model_id] || "";

            return (
              <TableRow
                key={entry.model_id}
                className="border-border/60 hover:bg-muted/50 transition-colors group cursor-pointer"
                onClick={() => window.location.href = `/model/${entry.model_id}`}
              >
                <TableCell className="text-center">
                  {rankDisplay(idx, entry.rank)}
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <ProviderIcon provider={entry.provider} size={24} className="shrink-0" />
                    <div>
                      <div className="font-medium text-sm group-hover:text-primary transition-colors">
                        {entry.display_name}
                      </div>
                      {model?.config && Object.keys(model.config).length > 0 && (
                        <Badge variant="outline" className="text-[9px] mt-0.5 px-1 py-0">
                          Extended Thinking
                        </Badge>
                      )}
                    </div>
                  </div>
                </TableCell>

                <TableCell className="text-center">
                  <Badge
                    variant="secondary"
                    className="text-[10px] gap-1"
                    style={{
                      borderColor: providerColor + "30",
                      color: providerColor,
                    }}
                  >
                    {entry.provider}
                  </Badge>
                </TableCell>

                <TableCell className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-mono font-semibold text-base">
                      {Math.round(entry.elo)}
                    </span>
                    <div className="w-20 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(5, eloBarWidth)}%`,
                          backgroundColor: providerColor,
                          opacity: 0.7,
                        }}
                      />
                    </div>
                  </div>
                </TableCell>

                <TableCell className="text-center">
                  <span className="text-muted-foreground font-mono text-xs">
                    {entry.arena_score}
                  </span>
                </TableCell>

                <TableCell className="text-center">
                  {stats ? (
                    <div className="flex items-center justify-center gap-1">
                      {stats.win_rate >= 60 ? (
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      ) : stats.win_rate <= 40 ? (
                        <TrendingDown className="h-3 w-3 text-red-600" />
                      ) : (
                        <Minus className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span
                        className={`font-mono text-xs font-medium ${
                          stats.win_rate >= 60
                            ? "text-green-600"
                            : stats.win_rate <= 40
                            ? "text-red-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {stats.win_rate}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">&mdash;</span>
                  )}
                </TableCell>

                <TableCell className="text-center">
                  {stats ? (
                    <span
                      className={`font-mono text-xs ${
                        stats.avg_persuasion > 0
                          ? "text-green-600"
                          : stats.avg_persuasion < 0
                          ? "text-red-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {stats.avg_persuasion > 0 ? "+" : ""}
                      {stats.avg_persuasion}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">&mdash;</span>
                  )}
                </TableCell>

                <TableCell className="text-center">
                  <span className="text-[10px] text-muted-foreground italic">
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
