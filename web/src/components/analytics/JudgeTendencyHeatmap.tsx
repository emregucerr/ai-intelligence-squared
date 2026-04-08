"use client";

import { JudgeTendencies } from "@/lib/types";
import { MODELS, PROVIDER_COLORS, PERSONA_MAP } from "@/lib/models";
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
      <div className="text-center py-8 text-muted-foreground">
        <p>Judge tendency data will appear after the benchmark completes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Per-Judge Stats Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Judge Profiles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {modelIds.map((jid) => {
            const stats = judgeData[jid];
            if (!stats) return null;
            const model = MODELS.find((m) => m.id === jid)!;
            const color = PROVIDER_COLORS[model.provider];
            const persona = PERSONA_MAP[jid];

            return (
              <div
                key={jid}
                className="rounded-lg border border-border/50 bg-card/50 p-4 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-6 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <div>
                    <p className="text-xs font-semibold truncate">
                      {model.display_name}
                    </p>
                    <p className="text-[10px] text-muted-foreground italic">
                      {persona}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <div>
                    <span className="text-muted-foreground">Flip rate</span>
                    <p className="font-mono font-semibold">
                      {stats.stance_flip_rate}%
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Avg Δ conf</span>
                    <p
                      className={`font-mono font-semibold ${
                        stats.avg_confidence_delta > 0
                          ? "text-green-400"
                          : stats.avg_confidence_delta < 0
                          ? "text-red-400"
                          : ""
                      }`}
                    >
                      {stats.avg_confidence_delta > 0 ? "+" : ""}
                      {stats.avg_confidence_delta}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">FOR bias</span>
                    <p className="font-mono font-semibold text-blue-400">
                      {stats.for_vote_pct}%
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">AGAINST</span>
                    <p className="font-mono font-semibold text-red-400">
                      {stats.against_vote_pct}%
                    </p>
                  </div>
                </div>

                {/* Self-judging */}
                {stats.self_judging.total > 0 && (
                  <div className="pt-1 border-t border-border/30">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Self-bias</span>
                      <Badge
                        variant={
                          stats.self_judging.self_bias_rate > 60
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-[10px] px-1.5 py-0"
                      >
                        {stats.self_judging.self_bias_rate}%
                        {stats.self_judging.self_bias_rate > 60 ? " ⚠️" : ""}
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
          <h3 className="text-lg font-semibold mb-4">
            Cross-Model Favor Matrix
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Cell shows how often the judge (row) voted in favor of the debater (column).
            Higher = more favorable. Self-judging cells marked with ⚔️.
          </p>
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse w-full">
              <thead>
                <tr>
                  <th className="p-2 text-left text-muted-foreground">
                    Judge ↓ / Debater →
                  </th>
                  {modelIds.map((did) => {
                    const dm = MODELS.find((m) => m.id === did)!;
                    return (
                      <th key={did} className="p-1 text-center" title={dm.display_name}>
                        <span
                          className="inline-block w-2 h-6 rounded-full cursor-help"
                          style={{
                            backgroundColor: PROVIDER_COLORS[dm.provider],
                          }}
                        />
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
                    <tr key={jid} className="border-t border-border/20">
                      <td className="p-2 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-2 h-4 rounded-full"
                            style={{
                              backgroundColor: PROVIDER_COLORS[jm.provider],
                            }}
                          />
                          <span className="truncate max-w-[140px]">
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
                              —
                            </td>
                          );
                        }
                        const rate = entry.favor_rate;
                        // Color: green for high favor, red for low
                        const intensity = Math.abs(rate - 50) / 50;
                        const bg =
                          rate > 50
                            ? `rgba(34, 197, 94, ${intensity * 0.4})`
                            : `rgba(239, 68, 68, ${intensity * 0.4})`;
                        return (
                          <td
                            key={did}
                            className={`p-1 text-center font-mono ${
                              isSelf ? "ring-1 ring-yellow-500/50 rounded" : ""
                            }`}
                            style={{ backgroundColor: bg }}
                            title={`${jm.display_name} favored ${MODELS.find(m => m.id === did)?.display_name} in ${entry.favored}/${entry.total} judgments (${rate}%)${isSelf ? " [SELF-JUDGING]" : ""}`}
                          >
                            <span className="cursor-help">
                              {rate}%{isSelf ? " ⚔️" : ""}
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
