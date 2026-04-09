"use client";

import { DebateSummary } from "@/lib/types";
import { MODELS, PROVIDER_COLORS } from "@/lib/models";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Swords, Clock } from "lucide-react";
import Link from "next/link";

interface Props {
  debates: DebateSummary[];
}

export function RecentDebates({ debates }: Props) {
  if (debates.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <Swords className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p>Benchmark debates will appear here as they complete.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px]">
      <div className="space-y-3 pr-4">
        {debates.slice().reverse().map((debate) => {
          const modelFor = MODELS.find((m) => m.id === debate.model_for.id);
          const modelAgainst = MODELS.find(
            (m) => m.id === debate.model_against.id
          );
          const winnerSide = debate.score.winner_side;
          const winnerName =
            winnerSide === "FOR"
              ? debate.model_for.display_name
              : winnerSide === "AGAINST"
              ? debate.model_against.display_name
              : "Tie";

          return (
            <Link
              href={`/debate/${debate.debate_id}`}
              key={debate.debate_id}
              className="block rounded-lg border border-border/40 bg-card/30 p-3 hover:bg-card/50 transition-colors"
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">
                  {debate.score.initial.for}→{debate.score.final.for} FOR
                </Badge>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">
                  {debate.score.initial.against}→{debate.score.final.against} AGT
                </Badge>
                {debate.metadata?.elapsed_seconds && (
                  <span className="text-[9px] text-muted-foreground flex items-center gap-0.5 ml-auto">
                    <Clock className="h-2.5 w-2.5" />
                    {Math.round(debate.metadata.elapsed_seconds / 60)}m
                  </span>
                )}
              </div>

              {/* Matchup */}
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <div
                    className="w-1.5 h-4 rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        PROVIDER_COLORS[modelFor?.provider || ""] || "#888",
                    }}
                  />
                  <span
                    className={`truncate ${
                      winnerSide === "FOR" ? "font-bold text-blue-400" : ""
                    }`}
                  >
                    {debate.model_for.display_name}
                  </span>
                  {winnerSide === "FOR" && (
                    <Trophy className="h-3 w-3 text-yellow-400 shrink-0" />
                  )}
                </div>

                <span className="text-muted-foreground text-[10px] shrink-0">vs</span>

                <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                  {winnerSide === "AGAINST" && (
                    <Trophy className="h-3 w-3 text-yellow-400 shrink-0" />
                  )}
                  <span
                    className={`truncate ${
                      winnerSide === "AGAINST" ? "font-bold text-red-400" : ""
                    }`}
                  >
                    {debate.model_against.display_name}
                  </span>
                  <div
                    className="w-1.5 h-4 rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        PROVIDER_COLORS[modelAgainst?.provider || ""] || "#888",
                    }}
                  />
                </div>
              </div>

              {/* Topic snippet */}
              <p className="text-[10px] text-muted-foreground mt-1.5 line-clamp-1 italic">
                {debate.motion}
              </p>
            </Link>
          );
        })}
      </div>
    </ScrollArea>
  );
}
