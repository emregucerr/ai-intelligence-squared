"use client";

import { DebateSummary } from "@/lib/types";
import { MODELS } from "@/lib/models";
import { ProviderIcon } from "@/components/ProviderIcon";
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
      <div className="text-center py-8 text-muted-foreground text-xs">
        <Swords className="h-6 w-6 mx-auto mb-2 opacity-30" />
        <p>Benchmark debates will appear here as they complete.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px]">
      <div className="space-y-2 pr-3">
        {debates.slice().reverse().map((debate) => {
          const modelFor = MODELS.find((m) => m.id === debate.model_for.id);
          const modelAgainst = MODELS.find((m) => m.id === debate.model_against.id);
          const winnerSide = debate.score.winner_side;

          return (
            <Link
              href={`/debate/${debate.debate_id}`}
              key={debate.debate_id}
              className="block rounded-md border border-border bg-card p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">
                  {debate.score.initial.for}&rarr;{debate.score.final.for} FOR
                </Badge>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">
                  {debate.score.initial.against}&rarr;{debate.score.final.against} AGT
                </Badge>
                {debate.metadata?.elapsed_seconds && (
                  <span className="text-[9px] text-muted-foreground flex items-center gap-0.5 ml-auto">
                    <Clock className="h-2.5 w-2.5" />
                    {Math.round(debate.metadata.elapsed_seconds / 60)}m
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <ProviderIcon provider={modelFor?.provider || ""} size={16} className="shrink-0" />
                  <span
                    className={`truncate ${
                      winnerSide === "FOR" ? "font-semibold text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {debate.model_for.display_name}
                  </span>
                  {winnerSide === "FOR" && (
                    <Trophy className="h-3 w-3 text-yellow-600 shrink-0" />
                  )}
                </div>

                <span className="text-muted-foreground text-[10px] shrink-0">vs</span>

                <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                  {winnerSide === "AGAINST" && (
                    <Trophy className="h-3 w-3 text-yellow-600 shrink-0" />
                  )}
                  <span
                    className={`truncate ${
                      winnerSide === "AGAINST" ? "font-semibold text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {debate.model_against.display_name}
                  </span>
                  <ProviderIcon provider={modelAgainst?.provider || ""} size={16} className="shrink-0" />
                </div>
              </div>

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
