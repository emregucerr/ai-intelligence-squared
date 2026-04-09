"use client";

import { JudgeTendencies } from "@/lib/types";
import { MODELS, PERSONA_MAP } from "@/lib/models";
import { ProviderIcon } from "@/components/ProviderIcon";
import { Badge } from "@/components/ui/badge";

interface Props {
  tendencies: JudgeTendencies;
}

export function JudgeTendencyHeatmap({ tendencies }: Props) {
  const modelIds = MODELS.map((m) => m.id);
  const judgeData = tendencies.per_judge;
  const matrix = tendencies.cross_model_matrix;

  if (Object.keys(judgeData).length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-xs">
        <p>Judge tendency data will appear after the benchmark completes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Per-Judge Stats Cards */}
      <div>
        <h3 className="text-sm font-semibold mb-4 font-[family-name:var(--font-montserrat)]">Judge Profiles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2">
          {modelIds.map((jid) => {
            const stats = judgeData[jid];
            if (!stats) return null;
            const model = MODELS.find((m) => m.id === jid)!;
            const persona = PERSONA_MAP[jid];

            return (
              <div
                key={jid}
                className="rounded-md border border-border bg-card p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <ProviderIcon provider={model.provider} size={20} />
                  <div>
                    <p className="text-[10px] font-medium truncate">
                      {model.display_name}
                    </p>
                    <p className="text-[9px] text-muted-foreground italic">
                      {persona}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                  <div>
                    <span className="text-muted-foreground">Flip rate</span>
                    <p className="font-mono font-medium">
                      {stats.stance_flip_rate}%
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Avg &Delta; conf</span>
                    <p
                      className={`font-mono font-medium ${
                        stats.avg_confidence_delta > 0
                          ? "text-green-600"
                          : stats.avg_confidence_delta < 0
                          ? "text-red-600"
                          : ""
                      }`}
                    >
                      {stats.avg_confidence_delta > 0 ? "+" : ""}
                      {stats.avg_confidence_delta}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">FOR bias</span>
                    <p className="font-mono font-medium">
                      {stats.for_vote_pct}%
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">AGAINST</span>
                    <p className="font-mono font-medium">
                      {stats.against_vote_pct}%
                    </p>
                  </div>
                </div>

                {stats.self_judging.total > 0 && (
                  <div className="pt-1 border-t border-border">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">Self-bias</span>
                      <Badge
                        variant={
                          stats.self_judging.self_bias_rate > 60
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-[9px] px-1.5 py-0"
                      >
                        {stats.self_judging.self_bias_rate}%
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Cross-Model Matrix */}
      {Object.keys(matrix).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-4 font-[family-name:var(--font-montserrat)]">
            Cross-Model Favor Matrix
          </h3>
          <p className="text-[10px] text-muted-foreground mb-3">
            Cell shows how often the judge (row) voted in favor of the debater (column).
            Higher = more favorable. Self-judging cells marked with *.
          </p>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="text-[10px] border-collapse w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-2 text-left text-muted-foreground font-medium">
                    Judge / Debater
                  </th>
                  {modelIds.map((did) => {
                    const dm = MODELS.find((m) => m.id === did)!;
                    return (
                      <th key={did} className="p-1 text-center" title={dm.display_name}>
                        <ProviderIcon provider={dm.provider} size={14} className="mx-auto" />
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {modelIds.map((jid) => {
                  const jm = MODELS.find((m) => m.id === jid)!;
                  const judgeRow = matrix[jid] || {};
                  return (
                    <tr key={jid} className="border-t border-border/60">
                      <td className="p-2 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <ProviderIcon provider={jm.provider} size={12} />
                          <span className="truncate max-w-[130px]">
                            {jm.display_name}
                          </span>
                        </div>
                      </td>
                      {modelIds.map((did) => {
                        const entry = judgeRow[did];
                        const isSelf = jid === did;
                        if (!entry || entry.total === 0) {
                          return (
                            <td key={did} className="p-1 text-center text-muted-foreground">
                              &mdash;
                            </td>
                          );
                        }
                        const rate = entry.favor_rate;
                        const intensity = Math.abs(rate - 50) / 50;
                        const bg =
                          rate > 50
                            ? `rgba(22, 163, 74, ${intensity * 0.3})`
                            : `rgba(220, 38, 38, ${intensity * 0.3})`;
                        return (
                          <td
                            key={did}
                            className={`p-1 text-center font-mono ${
                              isSelf ? "ring-1 ring-yellow-600/40 rounded-sm" : ""
                            }`}
                            style={{ backgroundColor: bg }}
                            title={`${jm.display_name} favored ${MODELS.find(m => m.id === did)?.display_name} in ${entry.favored}/${entry.total} judgments (${rate}%)${isSelf ? " [SELF-JUDGING]" : ""}`}
                          >
                            <span className="cursor-help">
                              {rate}%{isSelf ? " *" : ""}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
