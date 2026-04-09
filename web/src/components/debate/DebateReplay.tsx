"use client";

import { DebateResult, Vote } from "@/lib/types";
import { MODELS, PROVIDER_COLORS, PERSONA_MAP } from "@/lib/models";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Trophy,
  Brain,
  Swords,
  MessageSquare,
  HelpCircle,
  Flag,
  Users,
  ArrowRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface Props {
  debate: DebateResult;
}

const phaseLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  opening: { label: "Opening Statement", icon: <Flag className="h-4 w-4" /> },
  rebuttal: {
    label: "Rebuttal",
    icon: <MessageSquare className="h-4 w-4" />,
  },
  cross_exam_r1: {
    label: "Cross-Examination Round 1",
    icon: <HelpCircle className="h-4 w-4" />,
  },
  cross_exam_r2: {
    label: "Cross-Examination Round 2",
    icon: <HelpCircle className="h-4 w-4" />,
  },
  cross_exam_r3: {
    label: "Cross-Examination Round 3",
    icon: <HelpCircle className="h-4 w-4" />,
  },
  audience_qa: {
    label: "Audience Q&A",
    icon: <Users className="h-4 w-4" />,
  },
  closing: { label: "Closing Statement", icon: <Flag className="h-4 w-4" /> },
};

function VoteCard({ vote, showChange, initialVote }: { vote: Vote; showChange?: boolean; initialVote?: Vote }) {
  const model = MODELS.find((m) => m.id === vote.judge_model_id);
  const color = PROVIDER_COLORS[model?.provider || ""] || "#888";
  const changed = initialVote && initialVote.stance !== vote.stance;

  return (
    <div
      className={`rounded-lg border p-3 ${
        vote.stance === "FOR"
          ? "border-blue-500/30 bg-blue-500/5"
          : vote.stance === "AGAINST"
          ? "border-red-500/30 bg-red-500/5"
          : "border-border/30 bg-muted/5"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-1.5 h-4 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs font-semibold truncate">
          {model?.display_name || vote.judge_model_id}
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground italic mb-1">
        {vote.persona}
      </p>
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={`text-[10px] ${
            vote.stance === "FOR"
              ? "text-blue-400 border-blue-500/50"
              : vote.stance === "AGAINST"
              ? "text-red-400 border-red-500/50"
              : ""
          }`}
        >
          {vote.stance}
        </Badge>
        <span className="text-[10px] font-mono text-muted-foreground">
          {vote.confidence}%
        </span>
        {changed && (
          <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-yellow-500/20 text-yellow-400">
            FLIPPED
          </Badge>
        )}
      </div>
      {vote.reasoning && (
        <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
          {vote.reasoning}
        </p>
      )}
    </div>
  );
}

export function DebateReplay({ debate }: Props) {
  const modelFor = MODELS.find((m) => m.id === debate.model_for.id);
  const modelAgainst = MODELS.find((m) => m.id === debate.model_against.id);
  const score = debate.score;

  // Group transcript by phase
  let currentPhase = "";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <Badge variant="outline" className="mb-4 text-xs">
          {debate.debate_id}
        </Badge>
        <h1 className="text-2xl font-bold mb-2">
          {debate.model_for.display_name}
          <span className="text-muted-foreground mx-3">vs</span>
          {debate.model_against.display_name}
        </h1>
        <p className="text-sm text-muted-foreground italic max-w-2xl mx-auto">
          &ldquo;{debate.motion}&rdquo;
        </p>
      </div>

      {/* Score Summary */}
      <Card className="p-6 bg-gradient-to-r from-blue-500/5 via-transparent to-red-500/5">
        <div className="grid grid-cols-3 gap-4 text-center">
          {/* FOR */}
          <div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <div
                className="w-2 h-6 rounded-full"
                style={{
                  backgroundColor:
                    PROVIDER_COLORS[modelFor?.provider || ""] || "#888",
                }}
              />
              <span className="font-semibold text-sm text-blue-400">
                {debate.model_for.display_name}
              </span>
              {score.winner_side === "FOR" && (
                <Trophy className="h-4 w-4 text-yellow-400" />
              )}
            </div>
            <div className="text-3xl font-bold text-blue-400">
              {score.final.for}
            </div>
            <div className="text-xs text-muted-foreground">
              {score.initial.for} → {score.final.for} votes
            </div>
            <div
              className={`text-sm font-mono mt-1 ${
                score.delta_for > 0 ? "text-green-400" : "text-muted-foreground"
              }`}
            >
              {score.delta_for > 0 ? "+" : ""}
              {score.delta_for}%
            </div>
          </div>

          {/* Middle */}
          <div className="flex flex-col items-center justify-center">
            <Swords className="h-8 w-8 text-muted-foreground mb-2" />
            <span className="text-xs text-muted-foreground">
              {debate.metadata?.elapsed_seconds
                ? `${Math.round(debate.metadata.elapsed_seconds / 60)}min`
                : ""}
            </span>
          </div>

          {/* AGAINST */}
          <div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <div
                className="w-2 h-6 rounded-full"
                style={{
                  backgroundColor:
                    PROVIDER_COLORS[modelAgainst?.provider || ""] || "#888",
                }}
              />
              <span className="font-semibold text-sm text-red-400">
                {debate.model_against.display_name}
              </span>
              {score.winner_side === "AGAINST" && (
                <Trophy className="h-4 w-4 text-yellow-400" />
              )}
            </div>
            <div className="text-3xl font-bold text-red-400">
              {score.final.against}
            </div>
            <div className="text-xs text-muted-foreground">
              {score.initial.against} → {score.final.against} votes
            </div>
            <div
              className={`text-sm font-mono mt-1 ${
                score.delta_against > 0
                  ? "text-green-400"
                  : "text-muted-foreground"
              }`}
            >
              {score.delta_against > 0 ? "+" : ""}
              {score.delta_against}%
            </div>
          </div>
        </div>
      </Card>

      {/* Initial Votes */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Users className="h-5 w-5 text-purple-400" />
          Initial Jury Votes (Pre-Debate)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {debate.initial_votes.map((vote, idx) => (
            <VoteCard key={idx} vote={vote} />
          ))}
        </div>
      </div>

      {/* Transcript */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-400" />
          Full Debate Transcript
        </h2>
        {debate.transcript.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              Transcript not available for this debate. Vote results and scoring details are shown above and below.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {debate.transcript.map((entry, idx) => {
              const showPhaseHeader = entry.phase !== currentPhase;
              currentPhase = entry.phase;
              const phaseInfo = phaseLabels[entry.phase] || {
                label: entry.phase,
                icon: null,
              };

              return (
                <div key={idx}>
                  {showPhaseHeader && (
                    <div className="flex items-center gap-2 mb-3 mt-6">
                      {phaseInfo.icon}
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        {phaseInfo.label}
                      </h3>
                      <Separator className="flex-1" />
                    </div>
                  )}

                  <div
                    className={`p-4 rounded-lg border ${
                      entry.side === "FOR"
                        ? "border-blue-500/20 bg-blue-500/5 ml-0 mr-8"
                        : "border-red-500/20 bg-red-500/5 ml-8 mr-0"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          entry.side === "FOR"
                            ? "text-blue-400 border-blue-500/50"
                            : "text-red-400 border-red-500/50"
                        }`}
                      >
                        {entry.side}
                      </Badge>
                      <span className="text-xs font-semibold">
                        {entry.speaker}
                      </span>
                      {entry.type && (
                        <Badge variant="secondary" className="text-[10px]">
                          {entry.type}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {entry.content}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Final Votes */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-400" />
          Final Jury Votes (Post-Debate)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {debate.final_votes.map((vote, idx) => {
            const initialVote = debate.initial_votes.find(
              (v) => v.judge_model_id === vote.judge_model_id
            );
            return (
              <VoteCard
                key={idx}
                vote={vote}
                showChange
                initialVote={initialVote}
              />
            );
          })}
        </div>
      </div>

      {/* Vote Details */}
      {score.vote_details && score.vote_details.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-400" />
            Vote Shift Analysis
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="text-left p-2">Judge</th>
                  <th className="text-center p-2">Before</th>
                  <th className="text-center p-2">→</th>
                  <th className="text-center p-2">After</th>
                  <th className="text-center p-2">Δ Conf</th>
                  <th className="text-center p-2">Self?</th>
                </tr>
              </thead>
              <tbody>
                {score.vote_details.map((vd, idx) => (
                  <tr key={idx} className="border-b border-border/20">
                    <td className="p-2 font-medium">
                      {MODELS.find((m) => m.id === vd.judge_model_id)?.display_name ||
                        vd.judge_model_id}
                    </td>
                    <td
                      className={`p-2 text-center ${
                        vd.initial_stance === "FOR"
                          ? "text-blue-400"
                          : vd.initial_stance === "AGAINST"
                          ? "text-red-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {vd.initial_stance} ({vd.initial_confidence})
                    </td>
                    <td className="p-2 text-center">
                      {vd.stance_changed ? (
                        <ArrowRight className="h-3 w-3 text-yellow-400 mx-auto" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td
                      className={`p-2 text-center font-semibold ${
                        vd.final_stance === "FOR"
                          ? "text-blue-400"
                          : vd.final_stance === "AGAINST"
                          ? "text-red-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {vd.final_stance} ({vd.final_confidence})
                    </td>
                    <td
                      className={`p-2 text-center font-mono ${
                        vd.confidence_delta > 0
                          ? "text-green-400"
                          : vd.confidence_delta < 0
                          ? "text-red-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {vd.confidence_delta > 0 ? "+" : ""}
                      {vd.confidence_delta}
                    </td>
                    <td className="p-2 text-center">
                      {vd.is_self_judging ? "⚔️" : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
