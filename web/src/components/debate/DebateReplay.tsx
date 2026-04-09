"use client";

import { DebateResult, Vote } from "@/lib/types";
import { MODELS } from "@/lib/models";
import { ProviderIcon } from "@/components/ProviderIcon";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Trophy,
  Swords,
  MessageSquare,
  HelpCircle,
  Flag,
  Users,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

interface Props {
  debate: DebateResult;
}

const phaseLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  opening: { label: "Opening Statement", icon: <Flag className="h-3.5 w-3.5" /> },
  rebuttal: {
    label: "Rebuttal",
    icon: <MessageSquare className="h-3.5 w-3.5" />,
  },
  cross_exam_r1: {
    label: "Cross-Examination Round 1",
    icon: <HelpCircle className="h-3.5 w-3.5" />,
  },
  cross_exam_r2: {
    label: "Cross-Examination Round 2",
    icon: <HelpCircle className="h-3.5 w-3.5" />,
  },
  cross_exam_r3: {
    label: "Cross-Examination Round 3",
    icon: <HelpCircle className="h-3.5 w-3.5" />,
  },
  audience_qa: {
    label: "Audience Q&A",
    icon: <Users className="h-3.5 w-3.5" />,
  },
  closing: { label: "Closing Statement", icon: <Flag className="h-3.5 w-3.5" /> },
};

function VoteCard({ vote, initialVote }: { vote: Vote; showChange?: boolean; initialVote?: Vote }) {
  const model = MODELS.find((m) => m.id === vote.judge_model_id);
  const changed = initialVote && initialVote.stance !== vote.stance;

  return (
    <div
      className={`rounded-md border p-3 ${
        vote.stance === "FOR"
          ? "border-primary/20 bg-primary/[0.02]"
          : vote.stance === "AGAINST"
          ? "border-destructive/20 bg-destructive/[0.02]"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <ProviderIcon provider={model?.provider || ""} size={14} />
        <span className="text-[10px] font-medium truncate">
          {model?.display_name || vote.judge_model_id}
        </span>
      </div>
      <p className="text-[9px] text-muted-foreground italic mb-1">
        {vote.persona}
      </p>
      <div className="flex items-center gap-1.5">
        <Badge
          variant="outline"
          className={`text-[9px] ${
            vote.stance === "FOR"
              ? "border-primary/30"
              : vote.stance === "AGAINST"
              ? "border-destructive/30"
              : ""
          }`}
        >
          {vote.stance}
        </Badge>
        <span className="text-[9px] font-mono text-muted-foreground">
          {vote.confidence}%
        </span>
        {changed && (
          <Badge variant="secondary" className="text-[8px] px-1 py-0">
            FLIPPED
          </Badge>
        )}
      </div>
      {vote.reasoning && (
        <p className="text-[9px] text-muted-foreground mt-1 line-clamp-2">
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

  const transcriptWithHeaders = debate.transcript.map((entry, idx) => ({
    ...entry,
    showPhaseHeader: idx === 0 || entry.phase !== debate.transcript[idx - 1].phase,
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <Badge variant="outline" className="mb-4 text-[10px] font-mono">
          {debate.debate_id}
        </Badge>
        <h1 className="text-xl font-bold mb-2 font-[family-name:var(--font-montserrat)]">
          {debate.model_for.display_name}
          <span className="text-muted-foreground mx-3">vs</span>
          {debate.model_against.display_name}
        </h1>
        <p className="text-xs text-muted-foreground italic max-w-2xl mx-auto">
          &ldquo;{debate.motion}&rdquo;
        </p>
      </div>

      {/* Score Summary */}
      <Card className="p-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <ProviderIcon provider={modelFor?.provider || ""} size={20} />
              <span className="font-medium text-xs">
                {debate.model_for.display_name}
              </span>
              {score.winner_side === "FOR" && (
                <Trophy className="h-3.5 w-3.5 text-yellow-600" />
              )}
            </div>
            <div className="text-2xl font-bold font-mono">
              {score.final.for}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {score.initial.for} &rarr; {score.final.for} votes
            </div>
            <div
              className={`text-xs font-mono mt-1 ${
                score.delta_for > 0 ? "text-green-600" : "text-muted-foreground"
              }`}
            >
              {score.delta_for > 0 ? "+" : ""}
              {score.delta_for}%
            </div>
          </div>

          <div className="flex flex-col items-center justify-center">
            <Swords className="h-6 w-6 text-muted-foreground mb-2" />
            <span className="text-[10px] text-muted-foreground">
              {debate.metadata?.elapsed_seconds
                ? `${Math.round(debate.metadata.elapsed_seconds / 60)}min`
                : ""}
            </span>
          </div>

          <div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <ProviderIcon provider={modelAgainst?.provider || ""} size={20} />
              <span className="font-medium text-xs">
                {debate.model_against.display_name}
              </span>
              {score.winner_side === "AGAINST" && (
                <Trophy className="h-3.5 w-3.5 text-yellow-600" />
              )}
            </div>
            <div className="text-2xl font-bold font-mono">
              {score.final.against}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {score.initial.against} &rarr; {score.final.against} votes
            </div>
            <div
              className={`text-xs font-mono mt-1 ${
                score.delta_against > 0
                  ? "text-green-600"
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
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2 font-[family-name:var(--font-montserrat)]">
          <Users className="h-4 w-4 text-muted-foreground" />
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
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2 font-[family-name:var(--font-montserrat)]">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          Full Debate Transcript
        </h2>
        <div className="space-y-3">
          {transcriptWithHeaders.map((entry, idx) => {
            const phaseInfo = phaseLabels[entry.phase] || {
              label: entry.phase,
              icon: null,
            };

            return (
              <div key={idx}>
                {entry.showPhaseHeader && (
                  <div className="flex items-center gap-2 mb-3 mt-6">
                    {phaseInfo.icon}
                    <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {phaseInfo.label}
                    </h3>
                    <Separator className="flex-1" />
                  </div>
                )}

                <div
                  className={`p-4 rounded-md border ${
                    entry.side === "FOR"
                      ? "border-primary/15 bg-primary/[0.02] ml-0 mr-8"
                      : "border-destructive/15 bg-destructive/[0.02] ml-8 mr-0"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant="outline"
                      className={`text-[9px] ${
                        entry.side === "FOR"
                          ? "border-primary/30"
                          : "border-destructive/30"
                      }`}
                    >
                      {entry.side}
                    </Badge>
                    <span className="text-[10px] font-semibold">
                      {entry.speaker}
                    </span>
                    {entry.type && (
                      <Badge variant="secondary" className="text-[9px]">
                        {entry.type}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">
                    {entry.content}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Final Votes */}
      <div>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2 font-[family-name:var(--font-montserrat)]">
          <Trophy className="h-4 w-4 text-yellow-600" />
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
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2 font-[family-name:var(--font-montserrat)]">
            <TrendingUp className="h-4 w-4 text-green-600" />
            Vote Shift Analysis
          </h2>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-2 font-medium">Judge</th>
                  <th className="text-center p-2 font-medium">Before</th>
                  <th className="text-center p-2 font-medium">&rarr;</th>
                  <th className="text-center p-2 font-medium">After</th>
                  <th className="text-center p-2 font-medium">&Delta; Conf</th>
                  <th className="text-center p-2 font-medium">Self?</th>
                </tr>
              </thead>
              <tbody>
                {score.vote_details.map((vd, idx) => (
                  <tr key={idx} className="border-b border-border/60">
                    <td className="p-2 font-medium">
                      <div className="flex items-center gap-1.5">
                        <ProviderIcon provider={MODELS.find((m) => m.id === vd.judge_model_id)?.provider || ""} size={12} />
                        {MODELS.find((m) => m.id === vd.judge_model_id)?.display_name ||
                          vd.judge_model_id}
                      </div>
                    </td>
                    <td
                      className={`p-2 text-center ${
                        vd.initial_stance === "FOR"
                          ? "text-foreground"
                          : vd.initial_stance === "AGAINST"
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }`}
                    >
                      {vd.initial_stance} ({vd.initial_confidence})
                    </td>
                    <td className="p-2 text-center">
                      {vd.stance_changed ? (
                        <ArrowRight className="h-3 w-3 text-yellow-600 mx-auto" />
                      ) : (
                        <span className="text-muted-foreground">&mdash;</span>
                      )}
                    </td>
                    <td
                      className={`p-2 text-center font-semibold ${
                        vd.final_stance === "FOR"
                          ? "text-foreground"
                          : vd.final_stance === "AGAINST"
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }`}
                    >
                      {vd.final_stance} ({vd.final_confidence})
                    </td>
                    <td
                      className={`p-2 text-center font-mono ${
                        vd.confidence_delta > 0
                          ? "text-green-600"
                          : vd.confidence_delta < 0
                          ? "text-red-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {vd.confidence_delta > 0 ? "+" : ""}
                      {vd.confidence_delta}
                    </td>
                    <td className="p-2 text-center">
                      {vd.is_self_judging ? "*" : "&mdash;"}
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
