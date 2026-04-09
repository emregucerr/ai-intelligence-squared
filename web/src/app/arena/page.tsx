"use client";

import { useState, useRef, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { MODELS, DEBATE_TOPICS } from "@/lib/models";
import { ProviderIcon } from "@/components/ProviderIcon";
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
          <h1 className="text-2xl font-bold flex items-center justify-center gap-3 font-[family-name:var(--font-montserrat)]">
            <Swords className="h-6 w-6 text-muted-foreground" />
            Live Debate Arena
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Pick two models, enter your OpenRouter API key, and watch them debate live.
          </p>
        </div>

        {/* Setup Panel */}
        {debate.status === "idle" && (
          <div className="max-w-3xl mx-auto space-y-4">
            {/* API Key */}
            <Card className="p-5">
              <Label className="text-xs font-semibold mb-1.5 block font-[family-name:var(--font-montserrat)]">
                OpenRouter API Key
              </Label>
              <p className="text-[10px] text-muted-foreground mb-3">
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
                    className="pr-10 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </Card>

            {/* Model Selection */}
            <Card className="p-5">
              <Label className="text-xs font-semibold mb-3 block font-[family-name:var(--font-montserrat)]">
                Choose Combatants
              </Label>
              <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
                <div>
                  <div className="text-[10px] font-semibold text-foreground mb-2 flex items-center gap-1 uppercase tracking-wider">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    FOR (Proposition)
                  </div>
                  <select
                    value={modelForId}
                    onChange={(e) => setModelForId(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs"
                  >
                    {MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.display_name} ({m.provider})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground font-semibold">VS</span>
                </div>

                <div>
                  <div className="text-[10px] font-semibold text-muted-foreground mb-2 flex items-center gap-1 uppercase tracking-wider">
                    <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                    AGAINST (Opposition)
                  </div>
                  <select
                    value={modelAgainstId}
                    onChange={(e) => setModelAgainstId(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs"
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
            <Card className="p-5">
              <Label className="text-xs font-semibold mb-3 block font-[family-name:var(--font-montserrat)]">
                Debate Topic
              </Label>
              <div className="space-y-1.5 mb-3">
                {DEBATE_TOPICS.map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTopic(t);
                      setCustomTopic("");
                    }}
                    className={`w-full text-left text-xs px-3 py-2 rounded-md border transition-colors ${
                      topic === t && !customTopic
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border hover:border-foreground/20 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <Separator className="my-3" />
              <Label className="text-[10px] text-muted-foreground mb-2 block">
                Or enter a custom topic:
              </Label>
              <Input
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="This house believes that..."
                className="text-xs"
              />
            </Card>

            {/* Start Button */}
            <Button
              onClick={startDebate}
              disabled={!apiKey || modelForId === modelAgainstId}
              size="lg"
              className="w-full gap-2 text-sm py-5"
            >
              <Play className="h-4 w-4" />
              Start Debate
            </Button>
            {modelForId === modelAgainstId && (
              <p className="text-[10px] text-destructive text-center">
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
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              <Badge
                variant="outline"
                className={`text-xs px-3 py-1 ${
                  debate.status === "complete"
                    ? "border-green-600/30 text-green-700"
                    : debate.status === "error"
                    ? "border-destructive/30 text-destructive"
                    : "border-primary/30 text-foreground"
                }`}
              >
                {debate.status === "complete"
                  ? "Debate Complete"
                  : debate.status === "error"
                  ? `Error: ${debate.error}`
                  : debate.phase}
              </Badge>
            </div>

            {/* Combatants Header */}
            <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-card">
                  <ProviderIcon provider={modelFor?.provider || ""} size={20} />
                  <span className="font-medium text-xs">{modelFor?.display_name}</span>
                  <Badge variant="secondary" className="text-[9px]">
                    FOR
                  </Badge>
                </div>
              </div>
              <Swords className="h-5 w-5 text-muted-foreground" />
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-card">
                  <ProviderIcon provider={modelAgainst?.provider || ""} size={20} />
                  <span className="font-medium text-xs">{modelAgainst?.display_name}</span>
                  <Badge variant="outline" className="text-[9px]">
                    AGAINST
                  </Badge>
                </div>
              </div>
            </div>

            {/* Transcript */}
            <ScrollArea className="h-[500px] rounded-md border border-border bg-card">
              <div className="p-4 space-y-3">
                {debate.transcript.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-md border ${
                      entry.side === "FOR"
                        ? "border-primary/20 bg-primary/[0.02] ml-0 mr-12"
                        : "border-destructive/20 bg-destructive/[0.02] ml-12 mr-0"
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
                        {entry.phase.toUpperCase()}
                      </Badge>
                      <span className="text-[10px] font-semibold">{entry.speaker}</span>
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
                ))}
                {debate.status === "running" && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Jury Panel */}
            {(debate.initialVotes.length > 0 || debate.finalVotes.length > 0) && (
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 font-[family-name:var(--font-montserrat)]">
                  <Zap className="h-4 w-4 text-muted-foreground" />
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
                          className={`rounded-md border p-3 text-center ${
                            vote.stance === "FOR"
                              ? "border-primary/20 bg-primary/[0.02]"
                              : vote.stance === "AGAINST"
                              ? "border-destructive/20 bg-destructive/[0.02]"
                              : "border-border bg-card"
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <ProviderIcon provider={model?.provider || ""} size={14} />
                            <p className="text-[10px] font-medium truncate">
                              {model?.display_name || vote.judge_model_id}
                              {isDebater && " *"}
                            </p>
                          </div>
                          <p className="text-[9px] text-muted-foreground italic truncate">
                            {vote.persona}
                          </p>
                          <Badge
                            variant="outline"
                            className={`mt-1 text-[10px] ${
                              vote.stance === "FOR"
                                ? "border-primary/30"
                                : vote.stance === "AGAINST"
                                ? "border-destructive/30"
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
              <Card className="p-6 border-border">
                <div className="text-center">
                  <Trophy className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                  <h3 className="text-lg font-bold mb-1 font-[family-name:var(--font-montserrat)]">
                    Winner:{" "}
                    <span>
                      {(debate.score as Record<string, string>).winner_side === "FOR"
                        ? modelFor?.display_name
                        : modelAgainst?.display_name}
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {(debate.score as Record<string, string>).winner_side} side won with{" "}
                    &Delta;{" "}
                    {(debate.score as Record<string, string>).winner_side === "FOR"
                      ? (debate.score as Record<string, number>).delta_for
                      : (debate.score as Record<string, number>).delta_against}
                    % vote conversion
                  </p>
                </div>

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
                    className="gap-2 text-xs"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
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
