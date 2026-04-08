#!/usr/bin/env python3
"""
Generate realistic sample benchmark results for the web app.
Uses actual data from completed debates and simulates the rest
based on the arena scores and known model characteristics.

This gives us a complete dataset to build/demo the UI while
the real benchmark runs (or when credits are limited).
"""

import json
import os
import random
import time
from itertools import combinations

from benchmark.models import MODELS, PERSONA_MAP, TOPICS, get_all_model_ids
from benchmark.scoring import compute_elo_update, EloTracker, analyze_judge_tendencies

random.seed(42)  # Reproducible

RESULTS_DIR = "benchmark/results"
DEBATES_DIR = os.path.join(RESULTS_DIR, "debates")


def simulate_vote(model_id: str, motion: str, side_preference: str = None) -> dict:
    """Generate a realistic simulated vote based on model and persona characteristics."""
    persona = PERSONA_MAP.get(model_id, "Neutral judge")

    # Base stance probability influenced by persona
    persona_biases = {
        "Risk-averse economist": {"FOR": 0.3, "AGAINST": 0.4, "UNDECIDED": 0.3},
        "Philosophy professor": {"FOR": 0.35, "AGAINST": 0.35, "UNDECIDED": 0.3},
        "Neutral academic": {"FOR": 0.3, "AGAINST": 0.3, "UNDECIDED": 0.4},
        "Contrarian thinker": {"FOR": 0.4, "AGAINST": 0.45, "UNDECIDED": 0.15},
        "Environmental activist": {"FOR": 0.45, "AGAINST": 0.35, "UNDECIDED": 0.2},
        "Corporate executive": {"FOR": 0.35, "AGAINST": 0.4, "UNDECIDED": 0.25},
        "Skeptical policymaker": {"FOR": 0.25, "AGAINST": 0.45, "UNDECIDED": 0.3},
        "Optimistic technologist": {"FOR": 0.5, "AGAINST": 0.25, "UNDECIDED": 0.25},
        "Union labor representative": {"FOR": 0.35, "AGAINST": 0.45, "UNDECIDED": 0.2},
        "Data scientist and AI researcher": {"FOR": 0.35, "AGAINST": 0.35, "UNDECIDED": 0.3},
    }

    probs = persona_biases.get(persona, {"FOR": 0.33, "AGAINST": 0.33, "UNDECIDED": 0.34})

    # Apply side preference (from debate quality)
    if side_preference:
        probs[side_preference] += 0.15
        total = sum(probs.values())
        probs = {k: v / total for k, v in probs.items()}

    stance = random.choices(list(probs.keys()), weights=list(probs.values()), k=1)[0]
    confidence = random.randint(35, 85)

    return {
        "stance": stance,
        "confidence": confidence,
        "reasoning": f"Based on {persona.lower()} perspective analysis of the arguments.",
        "judge_model_id": model_id,
        "persona": persona,
    }


def simulate_debate(model_for: dict, model_against: dict, motion: str, debate_id: str) -> dict:
    """Generate a realistic simulated debate result."""
    # Determine winner based on arena scores (higher score = better debater)
    score_diff = model_for["arena_score"] - model_against["arena_score"]
    # Normalize to a win probability
    for_win_prob = 0.5 + (score_diff / 200)  # ~50% base, shifted by score diff
    for_win_prob = max(0.2, min(0.8, for_win_prob))  # Clamp

    # Determine which side the stronger debater wins
    for_wins = random.random() < for_win_prob

    # Generate initial votes (before debate)
    initial_votes = []
    for m in MODELS:
        vote = simulate_vote(m["id"], motion)
        initial_votes.append(vote)

    # Generate final votes (after debate, influenced by winner)
    winner_side = "FOR" if for_wins else "AGAINST"
    final_votes = []
    for i, m in enumerate(MODELS):
        init = initial_votes[i]
        # Chance to flip based on debate performance
        flip_prob = 0.3 if init["stance"] == "UNDECIDED" else 0.15
        if init["stance"] != winner_side and random.random() < flip_prob:
            vote = {
                **init,
                "stance": winner_side,
                "confidence": random.randint(55, 85),
                "reasoning": f"Convinced by the {winner_side} side's stronger arguments.",
            }
        else:
            # Adjust confidence
            delta = random.randint(-10, 15)
            vote = {
                **init,
                "confidence": max(20, min(95, init["confidence"] + delta)),
            }
        final_votes.append(vote)

    # Compute score from votes
    n = len(MODELS)
    init_for = sum(1 for v in initial_votes if v["stance"] == "FOR")
    init_against = sum(1 for v in initial_votes if v["stance"] == "AGAINST")
    final_for = sum(1 for v in final_votes if v["stance"] == "FOR")
    final_against = sum(1 for v in final_votes if v["stance"] == "AGAINST")

    delta_for = round((final_for - init_for) / n * 100, 1)
    delta_against = round((final_against - init_against) / n * 100, 1)

    if delta_for > delta_against:
        winner_side_score = "FOR"
        winner_model_id = model_for["id"]
    elif delta_against > delta_for:
        winner_side_score = "AGAINST"
        winner_model_id = model_against["id"]
    else:
        winner_side_score = "TIE"
        winner_model_id = None

    # Build vote details
    vote_details = []
    for init_v, final_v in zip(initial_votes, final_votes):
        jid = init_v["judge_model_id"]
        is_self_for = jid == model_for["id"]
        is_self_against = jid == model_against["id"]
        vote_details.append({
            "judge_model_id": jid,
            "persona": init_v.get("persona", ""),
            "initial_stance": init_v["stance"],
            "initial_confidence": init_v["confidence"],
            "final_stance": final_v["stance"],
            "final_confidence": final_v["confidence"],
            "stance_changed": init_v["stance"] != final_v["stance"],
            "confidence_delta": final_v["confidence"] - init_v["confidence"],
            "is_self_judging": is_self_for or is_self_against,
            "self_judging_side": "FOR" if is_self_for else ("AGAINST" if is_self_against else None),
        })

    conf_for_init = sum(v["confidence"] for v in initial_votes if v["stance"] == "FOR")
    conf_against_init = sum(v["confidence"] for v in initial_votes if v["stance"] == "AGAINST")
    conf_for_final = sum(v["confidence"] for v in final_votes if v["stance"] == "FOR")
    conf_against_final = sum(v["confidence"] for v in final_votes if v["stance"] == "AGAINST")

    score = {
        "winner_side": winner_side_score,
        "winner_model_id": winner_model_id,
        "initial": {
            "for": init_for,
            "against": init_against,
            "undecided": n - init_for - init_against,
            "pct_for": round(init_for / n * 100, 1),
            "pct_against": round(init_against / n * 100, 1),
        },
        "final": {
            "for": final_for,
            "against": final_against,
            "undecided": n - final_for - final_against,
            "pct_for": round(final_for / n * 100, 1),
            "pct_against": round(final_against / n * 100, 1),
        },
        "delta_for": delta_for,
        "delta_against": delta_against,
        "confidence": {
            "for_initial": conf_for_init,
            "for_final": conf_for_final,
            "against_initial": conf_against_init,
            "against_final": conf_against_final,
        },
        "persuasion_for": conf_for_final - conf_for_init,
        "persuasion_against": conf_against_final - conf_against_init,
        "vote_details": vote_details,
    }

    return {
        "debate_id": debate_id,
        "motion": motion,
        "model_for": {"id": model_for["id"], "display_name": model_for["display_name"]},
        "model_against": {"id": model_against["id"], "display_name": model_against["display_name"]},
        "transcript": [],  # Empty for simulated - saves space
        "initial_votes": initial_votes,
        "final_votes": final_votes,
        "audience_questions": [],
        "score": score,
        "metadata": {
            "elapsed_seconds": random.randint(180, 480),
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        },
    }


def main():
    os.makedirs(DEBATES_DIR, exist_ok=True)

    # Load any existing real debate results
    real_results = []
    real_ids = set()
    for fname in os.listdir(DEBATES_DIR):
        if fname.endswith(".json") and not fname.startswith("test"):
            fpath = os.path.join(DEBATES_DIR, fname)
            with open(fpath) as f:
                result = json.load(f)
                real_results.append(result)
                real_ids.add(result["debate_id"])

    print(f"Found {len(real_results)} real debate results")

    # Generate all 45 matchups
    all_results = list(real_results)  # Start with real data
    pairs = list(combinations(MODELS, 2))

    for i, (model_a, model_b) in enumerate(pairs):
        topic = TOPICS[i % len(TOPICS)]
        debate_id = f"debate-{i+1:03d}-{model_a['id']}-vs-{model_b['id']}"

        if debate_id in real_ids:
            print(f"  [REAL] {debate_id}")
            continue

        result = simulate_debate(model_a, model_b, topic, debate_id)
        all_results.append(result)
        print(f"  [SIM]  {debate_id}: {result['score']['winner_side']} ({result['score']['winner_model_id']})")

    # Compute ELO
    elo = EloTracker(get_all_model_ids())
    for result in all_results:
        elo.update(
            result["model_for"]["id"],
            result["model_against"]["id"],
            result["score"]["winner_model_id"],
            debate_id=result["debate_id"],
        )

    # Judge tendency analysis
    judge_analysis = analyze_judge_tendencies(all_results)

    # Build summary
    leaderboard = elo.to_dict()

    # Add win stats
    from collections import Counter
    win_counts = Counter()
    debate_counts = Counter()
    for r in all_results:
        fid = r["model_for"]["id"]
        aid = r["model_against"]["id"]
        debate_counts[fid] += 1
        debate_counts[aid] += 1
        wid = r["score"]["winner_model_id"]
        if wid:
            win_counts[wid] += 1

    for entry in leaderboard["leaderboard"]:
        mid = entry["model_id"]
        total = debate_counts.get(mid, 0)
        wins = win_counts.get(mid, 0)
        entry["wins"] = wins
        entry["losses"] = total - wins
        entry["win_rate"] = round(wins / total * 100, 1) if total else 0

    summary = {
        "leaderboard": leaderboard["leaderboard"],
        "elo_history": leaderboard["history"],
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

    # Save
    outpath = os.path.join(RESULTS_DIR, "benchmark_summary.json")
    with open(outpath, "w") as f:
        json.dump(summary, f, indent=2)

    # Also save to web data dir
    web_data = "web/src/data/benchmark-results.json"
    os.makedirs(os.path.dirname(web_data), exist_ok=True)
    with open(web_data, "w") as f:
        json.dump(summary, f, indent=2)

    print(f"\n📊 Results saved to {outpath} and {web_data}")
    print(f"   Total debates: {len(all_results)} ({len(real_results)} real + {len(all_results) - len(real_results)} simulated)")
    print(f"\n🏆 Leaderboard:")
    for entry in leaderboard["leaderboard"]:
        print(f"   #{entry['rank']} {entry['display_name']:35s} ELO: {entry['elo']:.0f}  Wins: {entry.get('wins', 0)}/{debate_counts.get(entry['model_id'], 0)}")


if __name__ == "__main__":
    main()
