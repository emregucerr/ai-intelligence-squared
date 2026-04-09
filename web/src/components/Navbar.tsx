"use client";

import Link from "next/link";
import { Swords, BarChart3, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-red-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">AI²</span>
              </div>
              <div className="absolute -inset-1 rounded-lg bg-gradient-to-br from-blue-500/20 to-red-500/20 blur-sm group-hover:blur-md transition-all" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">
                Intelligence Squared
              </h1>
              <p className="text-[10px] text-muted-foreground leading-none">
                LLM Debate Benchmark
              </p>
            </div>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2 text-sm">
                <BarChart3 className="h-4 w-4" />
                Leaderboard
              </Button>
            </Link>
            <Link href="/arena">
              <Button
                size="sm"
                className="gap-2 text-sm bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-500 hover:to-red-500 text-white border-0"
              >
                <Swords className="h-4 w-4" />
                Live Arena
                <Zap className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
