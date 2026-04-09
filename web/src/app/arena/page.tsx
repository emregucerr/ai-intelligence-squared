"use client";

import { useState, useRef, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { MODELS, DEBATE_TOPICS, PROVIDER_COLORS } from "@/lib/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Swords,
  Play,
  Loader2,
  Eye,
  EyeOff,
  Zap,
  Brain,
  ChevronRight,
  Trophy,
  ArrowLeftRight,
} from "lucide-react";

interface Vote {
  stance: string;
  confidence: number;
  reasoning: string;
  judge_model_id: string;
  persona: string;
}

interface TranscriptEntry {
  phase: string;
  speaker: string;
  side: string;
  content: string;
  type?: string;
}

interface DebateState {
  status: "idle" | "running" | "complete" | "error";
  phase: string;
  transcript: TranscriptEntry[];
  initialVotes: Vote[];
  finalVotes: Vote[];
  score: Record<string, unknown> | null;
  error?: string;
}

export default function ArenaPage() {
  const [apiKey, setApiKey] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("openrouter_api_key") || "";
    }
    return "";
  });
  const [showKey, setShowKey] = useState(false);
  const [modelForId, setModelForId] = useState(MODELS[0].id);
  const [modelAgainstId, setModelAgainstId] = useState(MODELS[MODELS.length - 1].id);
  const [topic, setTopic] = useState(DEBATE_TOPICS[0]);
  const [customTopic, setCustomTopic] = useState("");
  const [debate, setDebate] = useState<DebateState>({
    status: "idle",
    phase: "",
    transcript: [],
    initialVotes: [],
    finalVotes: [],
    score: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const saveApiKey = useCallback((key: string) => {
    setApiKey(key);
    if (typeof window !== "undefined") {
      localStorage.setItem("openrouter_api_key", key);
    }
  }, []);

  const startDebate = async () => {
    if (!apiKey) {
      alert("Please enter your OpenRouter API key");
      return;
    }

    const useTopic = customTopic || topic;
    const modelFor = MODELS.find((m) => m.id === modelForId)!;
    const modelAgainst = MODELS.find((m) => m.id === modelAgainstId)!;

    abortRef.current = new AbortController();

    setDebate({
      status: "running",
      phase: "Starting...",
      transcript: [],
      initialVotes: [],
      finalVotes: [],
      score: null,
    });

    try {
      const response = await fetch("/api/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_for: modelFor,
          model_against: modelAgainst,
          motion: useTopic,
          api_key: apiKey,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to start debate");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response stream");

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const event = JSON.parse(data);
            setDebate((prev) => {
              const next = { ...prev };
              if (event.phase) next.phase = event.phase;

              if (event.type === "transcript") {
                next.transcript = [...prev.transcript, event.entry];
              } else if (event.type === "initial_votes") {
                next.initialVotes = event.votes;
              } else if (event.type === "final_votes") {
                next.finalVotes = event.votes;
              } else if (event.type === "score") {
                next.score = event.score;
                next.status = "complete";
              } else if (event.type === "error") {
                next.error = event.message;
                next.status = "error";
              }

              return next;
            });
          } catch {
            // skip malformed events
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      setDebate((prev) => ({
        ...prev,
        status: "error",
        error: (error as Error).message,
      }));
    }
  };

  const modelFor = MODELS.find((m) => m.id === modelForId);
  const modelAgainst = MODELS.find((m) => m.id === modelAgainstId);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
            <Swords className="h-8 w-8 text-blue-400" />
            Live Debate Arena
            <Swords className="h-8 w-8 text-red-400 scale-x-[-1]" />
          </h1>
          <p className="text-muted-foreground mt-2">
            Pick two models, enter your OpenRouter API key, and watch them debate live.
          </p>
        </div>

        {/* Setup Panel */}
        {debate.status === "idle" && (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* API Key */}
            <Card className="p-6">
              <Label className="text-sm font-semibold mb-2 block">
                OpenRouter API Key
              </Label>
              <p className="text-xs text-muted-foreground mb-3">
                Your key is stored in your browser only and sent directly to OpenRouter.
                Never stored on our servers.
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => saveApiKey(e.target.value)}
                    placeholder="sk-or-v1-..."
                    className="pr-10 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </Card>

            {/* Model Selection */}
            <Card className="p-6">
              <Label className="text-sm font-semibold mb-4 block">
                Choose Combatants
              </Label>
              <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
                {/* FOR */}
                <div>
                  <div className="text-xs font-semibold text-blue-400 mb-2 flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    FOR (Proposition)
                  </div>
                  <select
                    value={modelForId}
                    onChange={(e) => setModelForId(e.target.value)}
                    className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm"
                  >
                    {MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.display_name} ({m.provider})
                      </option>
                    ))}
                  </select>
                </div>

                {/* VS */}
                <div className="flex flex-col items-center gap-1">
                  <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-bold">VS</span>
                </div>

                {/* AGAINST */}
                <div>
                  <div className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    AGAINST (Opposition)
                  </div>
                  <select
                    value={modelAgainstId}
                    onChange={(e) => setModelAgainstId(e.target.value)}
                    className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm"
                  >
                    {MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.display_name} ({m.provider})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>

            {/* Topic */}
            <Card className="p-6">
              <Label className="text-sm font-semibold mb-3 block">
                Debate Topic
              </Label>
              <div className="space-y-2 mb-3">
                {DEBATE_TOPICS.map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTopic(t);
                      setCustomTopic("");
                    }}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors ${
                      topic === t && !customTopic
                        ? "border-blue-500/50 bg-blue-500/10 text-blue-400"
                        : "border-border/50 hover:border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <Separator className="my-3" />
              <Label className="text-xs text-muted-foreground mb-2 block">
                Or enter a custom topic:
              </Label>
              <Input
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="This house believes that..."
                className="text-sm"
              />
            </Card>

            {/* Start Button */}
            <Button
              onClick={startDebate}
              disabled={!apiKey || modelForId === modelAgainstId}
              size="lg"
              className="w-full gap-2 bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-500 hover:to-red-500 text-white text-lg py-6"
            >
              <Play className="h-5 w-5" />
              Start Debate
            </Button>
            {modelForId === modelAgainstId && (
              <p className="text-xs text-red-400 text-center">
                Please select two different models
              </p>
            )}
          </div>
        )}

        {/* Live Debate View */}
        {debate.status !== "idle" && (
          <div className="space-y-6">
            {/* Phase Indicator */}
            <div className="flex items-center justify-center gap-2">
              {debate.status === "running" && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
              )}
              <Badge
                variant="outline"
                className={`text-sm px-4 py-1 ${
                  debate.status === "complete"
                    ? "border-green-500/50 text-green-400"
                    : debate.status === "error"
                    ? "border-red-500/50 text-red-400"
                    : "border-blue-500/50 text-blue-400"
                }`}
              >
                {debate.status === "complete"
                  ? "🏆 Debate Complete"
                  : debate.status === "error"
                  ? `❌ Error: ${debate.error}`
                  : debate.phase}
              </Badge>
            </div>

            {/* Combatants Header */}
            <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
              <div className="text-center">
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border"
                  style={{
                    borderColor: PROVIDER_COLORS[modelFor?.provider || ""] + "60",
                    backgroundColor: PROVIDER_COLORS[modelFor?.provider || ""] + "10",
                  }}
                >
                  <Brain className="h-4 w-4 text-blue-400" />
                  <span className="font-semibold text-sm">{modelFor?.display_name}</span>
                  <Badge variant="secondary" className="text-[10px] bg-blue-500/20 text-blue-400">
                    FOR
                  </Badge>
                </div>
              </div>
              <Swords className="h-6 w-6 text-muted-foreground" />
              <div className="text-center">
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border"
                  style={{
                    borderColor: PROVIDER_COLORS[modelAgainst?.provider || ""] + "60",
                    backgroundColor: PROVIDER_COLORS[modelAgainst?.provider || ""] + "10",
                  }}
                >
                  <Brain className="h-4 w-4 text-red-400" />
                  <span className="font-semibold text-sm">{modelAgainst?.display_name}</span>
                  <Badge variant="secondary" className="text-[10px] bg-red-500/20 text-red-400">
                    AGAINST
                  </Badge>
                </div>
              </div>
            </div>

            {/* Transcript */}
            <ScrollArea className="h-[500px] rounded-xl border border-border/50 bg-card/30">
              <div className="p-4 space-y-4">
                {debate.transcript.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border ${
                      entry.side === "FOR"
                        ? "border-blue-500/30 bg-blue-500/5 ml-0 mr-12"
                        : "border-red-500/30 bg-red-500/5 ml-12 mr-0"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          entry.side === "FOR"
                            ? "border-blue-500/50 text-blue-400"
                            : "border-red-500/50 text-red-400"
                        }`}
                      >
                        {entry.phase.toUpperCase()}
                      </Badge>
                      <span className="text-xs font-semibold">{entry.speaker}</span>
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
                ))}
                {debate.status === "running" && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Jury Panel */}
            {(debate.initialVotes.length > 0 || debate.finalVotes.length > 0) && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-400" />
                  Jury Panel ({debate.finalVotes.length > 0 ? "Final" : "Initial"} Votes)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {(debate.finalVotes.length > 0 ? debate.finalVotes : debate.initialVotes).map(
                    (vote, idx) => {
                      const isDebater =
                        vote.judge_model_id === modelForId ||
                        vote.judge_model_id === modelAgainstId;
                      const model = MODELS.find((m) => m.id === vote.judge_model_id);
                      return (
                        <div
                          key={idx}
                          className={`rounded-lg border p-3 text-center ${
                            vote.stance === "FOR"
                              ? "border-blue-500/40 bg-blue-500/10"
                              : vote.stance === "AGAINST"
                              ? "border-red-500/40 bg-red-500/10"
                              : "border-border/40 bg-muted/10"
                          }`}
                        >
                          <p className="text-[10px] font-semibold truncate">
                            {model?.display_name || vote.judge_model_id}
                            {isDebater && " ⚔️"}
                          </p>
                          <p className="text-[9px] text-muted-foreground italic truncate">
                            {vote.persona}
                          </p>
                          <Badge
                            variant="outline"
                            className={`mt-1 text-xs ${
                              vote.stance === "FOR"
                                ? "text-blue-400 border-blue-500/50"
                                : vote.stance === "AGAINST"
                                ? "text-red-400 border-red-500/50"
                                : "text-muted-foreground"
                            }`}
                          >
                            {vote.stance} ({vote.confidence})
                          </Badge>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            )}

            {/* Score */}
            {debate.score && (
              <Card className="p-6 bg-gradient-to-r from-blue-500/10 via-transparent to-red-500/10 border-border/50">
                <div className="text-center">
                  <Trophy className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                  <h3 className="text-xl font-bold mb-1">
                    Winner:{" "}
                    <span
                      className={
                        (debate.score as Record<string, string>).winner_side === "FOR"
                          ? "text-blue-400"
                          : "text-red-400"
                      }
                    >
                      {(debate.score as Record<string, string>).winner_side === "FOR"
                        ? modelFor?.display_name
                        : modelAgainst?.display_name}
                    </span>
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {(debate.score as Record<string, string>).winner_side} side won with{" "}
                    Δ{" "}
                    {(debate.score as Record<string, string>).winner_side === "FOR"
                      ? (debate.score as Record<string, number>).delta_for
                      : (debate.score as Record<string, number>).delta_against}
                    % vote conversion
                  </p>
                </div>

                {/* New debate button */}
                <div className="mt-4 text-center">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setDebate({
                        status: "idle",
                        phase: "",
                        transcript: [],
                        initialVotes: [],
                        finalVotes: [],
                        score: null,
                      })
                    }
                    className="gap-2"
                  >
                    <ChevronRight className="h-4 w-4" />
                    New Debate
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
