#!/usr/bin/env python3
"""
AI² Benchmark — Main Runner

Runs all 45 matchups (10 choose 2) between the top 10 LLMs.
Each matchup is a single debate with all 10 models as judges.
Results are saved to benchmark/results/.
"""

import asyncio
import json
import os
import sys
import time
from itertools import combinations

from dotenv import load_dotenv
load_dotenv()

from benchmark.models import MODELS, TOPICS, get_all_model_ids
from benchmark.debate import run_debate
from benchmark.scoring import EloTracker, analyze_judge_tendencies
from benchmark.api_client import print_stats


RESULTS_DIR = "benchmark/results"
DEBATES_DIR = os.path.join(RESULTS_DIR, "debates")


def generate_matchups() -> list[tuple[dict, dict, str, str]]:
    """Generate all 45 matchups with assigned topics and debate IDs.
    
    Returns list of (model_for, model_against, motion, debate_id).
    Model A (alphabetically first by id) always takes FOR side for consistency.
    """
    matchups = []
    pairs = list(combinations(MODELS, 2))
    
    for i, (model_a, model_b) in enumerate(pairs):
        topic = TOPICS[i % len(TOPICS)]
        debate_id = f"debate-{i+1:03d}-{model_a['id']}-vs-{model_b['id']}"
        # A takes FOR, B takes AGAINST
        matchups.append((model_a, model_b, topic, debate_id))
    
    return matchups


async def run_benchmark(start_from: int = 0, end_at: int = 45):
    """Run the full benchmark (or a slice of it).
    
    Args:
        start_from: Start from this matchup index (0-based, for resuming)
        end_at: End at this matchup index (exclusive)
    """
    os.makedirs(DEBATES_DIR, exist_ok=True)
    
    matchups = generate_matchups()
    total = min(end_at, len(matchups))
    
    print(f"🏁 AI² Benchmark Runner")
    print(f"   Total matchups: {len(matchups)}")
    print(f"   Running: {start_from+1} to {total}")
    print(f"   Models: {len(MODELS)}")
    print()
    
    # Initialize ELO tracker
    elo = EloTracker(get_all_model_ids())
    
    # Load existing results if resuming
    all_results = []
    existing_ids = set()
    
    if start_from > 0:
        for fname in os.listdir(DEBATES_DIR):
            if fname.endswith(".json") and fname != "test-001.json":
                fpath = os.path.join(DEBATES_DIR, fname)
                with open(fpath) as f:
                    result = json.load(f)
                    all_results.append(result)
                    existing_ids.add(result["debate_id"])
                    # Replay ELO updates
                    elo.update(
                        result["model_for"]["id"],
                        result["model_against"]["id"],
                        result["score"]["winner_model_id"],
                        debate_id=result["debate_id"],
                    )
        print(f"  Loaded {len(all_results)} existing results")
    
    # Run debates
    for i in range(start_from, total):
        model_for, model_against, motion, debate_id = matchups[i]
        
        # Skip if already completed
        if debate_id in existing_ids:
            print(f"\n[{i+1}/{total}] SKIP (already done): {debate_id}")
            continue
        
        print(f"\n{'='*70}")
        print(f"[{i+1}/{total}] {model_for['display_name']} (FOR) vs {model_against['display_name']} (AGAINST)")
        print(f"  Motion: {motion[:80]}...")
        print(f"  Debate ID: {debate_id}")
        print(f"{'='*70}")
        
        try:
            result = await run_debate(
                model_for=model_for,
                model_against=model_against,
                motion=motion,
                debate_id=debate_id,
            )
            
            # Save individual debate result
            result_dict = result.to_dict()
            fpath = os.path.join(DEBATES_DIR, f"{debate_id}.json")
            with open(fpath, "w") as f:
                json.dump(result_dict, f, indent=2)
            
            all_results.append(result_dict)
            
            # Update ELO
            elo.update(
                model_for["id"],
                model_against["id"],
                result.score["winner_model_id"],
                debate_id=debate_id,
            )
            
            # Print intermediate leaderboard
            print(f"\n  📊 Current ELO standings:")
            for entry in elo.get_leaderboard():
                print(f"    #{entry['rank']} {entry['display_name']:35s} ELO: {entry['elo']:.0f}")
            
            # Save intermediate leaderboard
            _save_leaderboard(elo, all_results)
            
            # Brief pause between debates to be nice to APIs
            await asyncio.sleep(2)
            
        except Exception as e:
            print(f"\n  ❌ DEBATE FAILED: {e}")
            import traceback
            traceback.print_exc()
            # Continue with next matchup
            continue
    
    # Final save
    _save_leaderboard(elo, all_results)
    
    print(f"\n{'='*70}")
    print(f"🏆 BENCHMARK COMPLETE")
    print(f"{'='*70}")
    
    for entry in elo.get_leaderboard():
        print(f"  #{entry['rank']} {entry['display_name']:35s} ELO: {entry['elo']:.0f}")
    
    print_stats()


def _save_leaderboard(elo: EloTracker, all_results: list[dict]):
    """Save leaderboard and judge tendency analysis."""
    # Leaderboard
    leaderboard_data = elo.to_dict()
    with open(os.path.join(RESULTS_DIR, "leaderboard.json"), "w") as f:
        json.dump(leaderboard_data, f, indent=2)
    
    # Judge tendency analysis
    judge_analysis = analyze_judge_tendencies(all_results)
    with open(os.path.join(RESULTS_DIR, "judge_tendencies.json"), "w") as f:
        json.dump(judge_analysis, f, indent=2)
    
    # Summary with all debate results for the web app
    summary = {
        "leaderboard": leaderboard_data["leaderboard"],
        "elo_history": leaderboard_data["history"],
        "judge_tendencies": judge_analysis,
        "total_debates": len(all_results),
        "debates": [
            {
                "debate_id": r["debate_id"],
                "motion": r["motion"],
                "model_for": r["model_for"],
                "model_against": r["model_against"],
                "score": r["score"],
                "metadata": r.get("metadata", {}),
            }
            for r in all_results
        ],
    }
    with open(os.path.join(RESULTS_DIR, "benchmark_summary.json"), "w") as f:
        json.dump(summary, f, indent=2)


if __name__ == "__main__":
    # Parse optional arguments: python -m benchmark.runner [start] [end]
    start = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    end = int(sys.argv[2]) if len(sys.argv) > 2 else 45
    asyncio.run(run_benchmark(start_from=start, end_at=end))
