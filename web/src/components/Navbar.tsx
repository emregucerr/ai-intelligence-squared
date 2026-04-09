"use client";

import Link from "next/link";
import { Swords, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs tracking-tight font-[family-name:var(--font-montserrat)]">AI&sup2;</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight tracking-tight font-[family-name:var(--font-montserrat)]">
                Intelligence Squared
              </h1>
              <p className="text-[10px] text-muted-foreground leading-none">
                LLM Debate Benchmark
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                <BarChart3 className="h-3.5 w-3.5" />
                Leaderboard
              </Button>
            </Link>
            <Link href="/arena">
              <Button
                size="sm"
                className="gap-1.5 text-xs"
              >
                <Swords className="h-3.5 w-3.5" />
                Live Arena
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
