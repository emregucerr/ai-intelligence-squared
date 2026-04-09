"""
AI² Benchmark — Scoring Module

Per-debate scoring and ELO calculation.
Also includes judge tendency analysis.
"""

import math
from collections import defaultdict


def compute_debate_score(
    initial_votes: list[dict],
    final_votes: list[dict],
    model_for_id: str,
    model_against_id: str,
) -> dict:
    """
    Compute scoring for a single debate.

    Returns dict with:
    - winner_side: "FOR" or "AGAINST" or "TIE"
    - winner_model_id: model id of winner
    - delta_for / delta_against: vote share change
    - confidence_for / confidence_against: total confidence scores
    - persuasion_for / persuasion_against: confidence-weighted persuasion
    - vote_details: per-judge vote tracking
    """
    n = len(initial_votes)

    # Count initial votes
    init_for = sum(1 for v in initial_votes if v["stance"] == "FOR")
    init_against = sum(1 for v in initial_votes if v["stance"] == "AGAINST")
    init_undecided = n - init_for - init_against

    init_pct_for = init_for / n * 100 if n > 0 else 0
    init_pct_against = init_against / n * 100 if n > 0 else 0

    # Count final votes
    final_for = sum(1 for v in final_votes if v["stance"] == "FOR")
    final_against = sum(1 for v in final_votes if v["stance"] == "AGAINST")
    final_undecided = n - final_for - final_against

    final_pct_for = final_for / n * 100 if n > 0 else 0
    final_pct_against = final_against / n * 100 if n > 0 else 0

    # Delta (vote conversion)
    delta_for = final_pct_for - init_pct_for
    delta_against = final_pct_against - init_pct_against

    # Confidence-weighted scores
    conf_for_initial = sum(
        v["confidence"] for v in initial_votes if v["stance"] == "FOR"
    )
    conf_against_initial = sum(
        v["confidence"] for v in initial_votes if v["stance"] == "AGAINST"
    )
    conf_for_final = sum(
        v["confidence"] for v in final_votes if v["stance"] == "FOR"
    )
    conf_against_final = sum(
        v["confidence"] for v in final_votes if v["stance"] == "AGAINST"
    )

    persuasion_for = conf_for_final - conf_for_initial
    persuasion_against = conf_against_final - conf_against_initial

    # Winner determination: side with highest delta
    if delta_for > delta_against:
        winner_side = "FOR"
        winner_model_id = model_for_id
    elif delta_against > delta_for:
        winner_side = "AGAINST"
        winner_model_id = model_against_id
    else:
        # Tiebreaker: confidence-weighted persuasion
        if persuasion_for > persuasion_against:
            winner_side = "FOR"
            winner_model_id = model_for_id
        elif persuasion_against > persuasion_for:
            winner_side = "AGAINST"
            winner_model_id = model_against_id
        else:
            winner_side = "TIE"
            winner_model_id = None

    # Per-judge vote tracking (for judge tendency analysis)
    vote_details = []
    for init_v, final_v in zip(initial_votes, final_votes):
        judge_id = init_v.get("judge_model_id", "unknown")
        is_self_judging_for = (judge_id == model_for_id)
        is_self_judging_against = (judge_id == model_against_id)
        vote_details.append({
            "judge_model_id": judge_id,
            "persona": init_v.get("persona", ""),
            "initial_stance": init_v["stance"],
            "initial_confidence": init_v["confidence"],
            "final_stance": final_v["stance"],
            "final_confidence": final_v["confidence"],
            "stance_changed": init_v["stance"] != final_v["stance"],
            "confidence_delta": final_v["confidence"] - init_v["confidence"],
            "is_self_judging": is_self_judging_for or is_self_judging_against,
            "self_judging_side": "FOR" if is_self_judging_for else ("AGAINST" if is_self_judging_against else None),
        })

    return {
        "winner_side": winner_side,
        "winner_model_id": winner_model_id,
        "initial": {
            "for": init_for, "against": init_against, "undecided": init_undecided,
            "pct_for": round(init_pct_for, 1), "pct_against": round(init_pct_against, 1),
        },
        "final": {
            "for": final_for, "against": final_against, "undecided": final_undecided,
            "pct_for": round(final_pct_for, 1), "pct_against": round(final_pct_against, 1),
        },
        "delta_for": round(delta_for, 1),
        "delta_against": round(delta_against, 1),
        "confidence": {
            "for_initial": conf_for_initial,
            "for_final": conf_for_final,
            "against_initial": conf_against_initial,
            "against_final": conf_against_final,
        },
        "persuasion_for": persuasion_for,
        "persuasion_against": persuasion_against,
        "vote_details": vote_details,
    }


# ─────────────────────────────────────────────────
# ELO Rating System
# ─────────────────────────────────────────────────

def compute_elo_update(
    elo_a: float,
    elo_b: float,
    winner: str,  # "a", "b", or "tie"
    k: float = 32.0,
) -> tuple[float, float]:
    """
    Standard ELO update.

    Args:
        elo_a: Current ELO of player A
        elo_b: Current ELO of player B
        winner: "a" if A won, "b" if B won, "tie" if draw
        k: K-factor (sensitivity)

    Returns:
        (new_elo_a, new_elo_b)
    """
    expected_a = 1.0 / (1.0 + 10.0 ** ((elo_b - elo_a) / 400.0))
    expected_b = 1.0 - expected_a

    if winner == "a":
        score_a, score_b = 1.0, 0.0
    elif winner == "b":
        score_a, score_b = 0.0, 1.0
    else:
        score_a, score_b = 0.5, 0.5

    new_elo_a = elo_a + k * (score_a - expected_a)
    new_elo_b = elo_b + k * (score_b - expected_b)

    return round(new_elo_a, 1), round(new_elo_b, 1)


class EloTracker:
    """Track ELO ratings across multiple debates."""

    def __init__(self, model_ids: list[str], starting_elo: float = 1500.0):
        self.ratings = {mid: starting_elo for mid in model_ids}
        self.history: list[dict] = []  # [{debate_id, model_a, model_b, winner, elo_before, elo_after}]

    def update(self, model_a_id: str, model_b_id: str, winner_id: str | None, debate_id: str = ""):
        """Update ELO after a debate."""
        elo_a = self.ratings[model_a_id]
        elo_b = self.ratings[model_b_id]

        if winner_id == model_a_id:
            winner = "a"
        elif winner_id == model_b_id:
            winner = "b"
        else:
            winner = "tie"

        new_a, new_b = compute_elo_update(elo_a, elo_b, winner)
        self.ratings[model_a_id] = new_a
        self.ratings[model_b_id] = new_b

        self.history.append({
            "debate_id": debate_id,
            "model_a": model_a_id,
            "model_b": model_b_id,
            "winner": winner_id,
            "elo_before": {model_a_id: elo_a, model_b_id: elo_b},
            "elo_after": {model_a_id: new_a, model_b_id: new_b},
        })

    def get_leaderboard(self) -> list[dict]:
        """Get sorted leaderboard."""
        from benchmark.models import get_model_by_id
        board = []
        for mid, elo in self.ratings.items():
            model = get_model_by_id(mid)
            board.append({
                "model_id": mid,
                "display_name": model["display_name"],
                "provider": model["provider"],
                "elo": round(elo, 1),
                "arena_score": model["arena_score"],
            })
        board.sort(key=lambda x: x["elo"], reverse=True)
        for i, entry in enumerate(board):
            entry["rank"] = i + 1
        return board

    def to_dict(self) -> dict:
        return {
            "ratings": self.ratings,
            "history": self.history,
            "leaderboard": self.get_leaderboard(),
        }


# ─────────────────────────────────────────────────
# Judge Tendency Analysis
# ─────────────────────────────────────────────────

def analyze_judge_tendencies(all_debate_results: list[dict]) -> dict:
    """
    Analyze how each model behaves as a judge across all debates.

    Returns a rich analysis dict with per-judge and cross-model data.
    """
    # Per-judge aggregates
    judge_stats = defaultdict(lambda: {
        "total_judgments": 0,
        "stance_flips": 0,
        "avg_confidence_initial": [],
        "avg_confidence_final": [],
        "confidence_deltas": [],
        "voted_for_count": 0,
        "voted_against_count": 0,
        "voted_undecided_count": 0,
        "self_judging_votes": [],
        "self_judging_favored_self": 0,
        "self_judging_total": 0,
    })

    # Cross-model: judge_model → debater_model → {wins, losses}
    cross_matrix = defaultdict(lambda: defaultdict(lambda: {"favored": 0, "total": 0}))

    for debate in all_debate_results:
        score = debate["score"]
        model_for_id = debate["model_for"]["id"]
        model_against_id = debate["model_against"]["id"]
        winner_side = score["winner_side"]

        for vd in score["vote_details"]:
            jid = vd["judge_model_id"]
            js = judge_stats[jid]

            js["total_judgments"] += 1
            if vd["stance_changed"]:
                js["stance_flips"] += 1
            js["avg_confidence_initial"].append(vd["initial_confidence"])
            js["avg_confidence_final"].append(vd["final_confidence"])
            js["confidence_deltas"].append(vd["confidence_delta"])

            final = vd["final_stance"]
            if final == "FOR":
                js["voted_for_count"] += 1
            elif final == "AGAINST":
                js["voted_against_count"] += 1
            else:
                js["voted_undecided_count"] += 1

            # Self-judging analysis
            if vd["is_self_judging"]:
                js["self_judging_total"] += 1
                self_side = vd["self_judging_side"]
                if final == self_side:
                    js["self_judging_favored_self"] += 1
                js["self_judging_votes"].append({
                    "debate_for": model_for_id,
                    "debate_against": model_against_id,
                    "self_side": self_side,
                    "voted": final,
                    "favored_self": final == self_side,
                })

            # Cross-model matrix
            if final == "FOR":
                cross_matrix[jid][model_for_id]["favored"] += 1
                cross_matrix[jid][model_for_id]["total"] += 1
                cross_matrix[jid][model_against_id]["total"] += 1
            elif final == "AGAINST":
                cross_matrix[jid][model_against_id]["favored"] += 1
                cross_matrix[jid][model_against_id]["total"] += 1
                cross_matrix[jid][model_for_id]["total"] += 1
            else:
                cross_matrix[jid][model_for_id]["total"] += 1
                cross_matrix[jid][model_against_id]["total"] += 1

    # Compute final stats
    result = {}
    for jid, js in judge_stats.items():
        n = js["total_judgments"]
        result[jid] = {
            "total_judgments": n,
            "stance_flip_rate": round(js["stance_flips"] / n * 100, 1) if n else 0,
            "avg_confidence_initial": round(sum(js["avg_confidence_initial"]) / n, 1) if n else 0,
            "avg_confidence_final": round(sum(js["avg_confidence_final"]) / n, 1) if n else 0,
            "avg_confidence_delta": round(sum(js["confidence_deltas"]) / n, 1) if n else 0,
            "for_vote_pct": round(js["voted_for_count"] / n * 100, 1) if n else 0,
            "against_vote_pct": round(js["voted_against_count"] / n * 100, 1) if n else 0,
            "undecided_vote_pct": round(js["voted_undecided_count"] / n * 100, 1) if n else 0,
            "self_judging": {
                "total": js["self_judging_total"],
                "favored_self": js["self_judging_favored_self"],
                "self_bias_rate": round(
                    js["self_judging_favored_self"] / js["self_judging_total"] * 100, 1
                ) if js["self_judging_total"] else 0,
                "votes": js["self_judging_votes"],
            },
        }

    # Cross-model matrix
    matrix = {}
    for jid in cross_matrix:
        matrix[jid] = {}
        for did in cross_matrix[jid]:
            entry = cross_matrix[jid][did]
            matrix[jid][did] = {
                "favored": entry["favored"],
                "total": entry["total"],
                "favor_rate": round(entry["favored"] / entry["total"] * 100, 1) if entry["total"] else 0,
            }

    return {
        "per_judge": result,
        "cross_model_matrix": matrix,
    }
