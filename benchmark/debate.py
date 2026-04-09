"""
AI² Benchmark — Debate Engine

Orchestrates a single complete debate between two model-agents,
judged by 10 independent judge-agents (one per model).
"""

import asyncio
import json
import time
from dataclasses import dataclass, field

from benchmark.api_client import chat_completion
from benchmark.audience import JudgePanel
from benchmark.prompts import (
    debater_system,
    OPENING_PROMPT,
    rebuttal_prompt,
    cross_exam_question_prompt,
    cross_exam_answer_prompt,
    audience_answer_prompt,
    closing_prompt,
)


@dataclass
class DebateResult:
    """Complete result of a single debate."""
    debate_id: str
    motion: str
    model_for: dict  # model config dict
    model_against: dict  # model config dict
    transcript: list[dict]  # ordered list of {phase, speaker, side, content}
    initial_votes: list[dict]
    final_votes: list[dict]
    audience_questions: list[dict]
    score: dict  # computed scoring data
    metadata: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "debate_id": self.debate_id,
            "motion": self.motion,
            "model_for": {"id": self.model_for["id"], "display_name": self.model_for["display_name"]},
            "model_against": {"id": self.model_against["id"], "display_name": self.model_against["display_name"]},
            "transcript": self.transcript,
            "initial_votes": self.initial_votes,
            "final_votes": self.final_votes,
            "audience_questions": self.audience_questions,
            "score": self.score,
            "metadata": self.metadata,
        }


class DebaterAgent:
    """A debater agent — a model with debate-role context.

    This is completely separate from any judge-agent using the same model.
    The debater sees the debate from a participant perspective.
    """

    def __init__(self, model_config: dict, side: str, motion: str):
        self.model = model_config
        self.side = side  # "FOR" or "AGAINST"
        self.motion = motion
        self.system_prompt = debater_system(side, motion)

    async def generate(self, user_prompt: str, max_tokens: int = 600) -> str:
        """Generate a response from this debater agent."""
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        result = await chat_completion(
            model_id=self.model["openrouter_id"],
            messages=messages,
            max_tokens=max_tokens,
            config=self.model.get("config"),
            temperature=0.7,
        )
        content = result.get("content") or ""
        return content.strip()


def _format_transcript(entries: list[dict]) -> str:
    """Format transcript entries into readable text for prompts."""
    parts = []
    for entry in entries:
        phase = entry.get("phase", "").upper()
        speaker = entry.get("speaker", "")
        side = entry.get("side", "")
        content = entry.get("content", "")
        label = f"[{phase}] {speaker} ({side})" if side else f"[{phase}] {speaker}"
        parts.append(f"{label}:\n{content}")
    return "\n\n---\n\n".join(parts)


async def run_debate(
    model_for: dict,
    model_against: dict,
    motion: str,
    debate_id: str = "",
    on_phase: callable = None,
) -> DebateResult:
    """
    Execute a complete debate between two models.

    Args:
        model_for: Model config for the FOR side
        model_against: Model config for the AGAINST side
        motion: The debate motion/proposition
        debate_id: Unique identifier for this debate
        on_phase: Optional callback(phase_name, data) for progress updates

    Returns:
        DebateResult with full transcript, votes, and scores
    """
    start_time = time.time()

    # Create debater agents (isolated contexts)
    debater_for = DebaterAgent(model_for, "FOR", motion)
    debater_against = DebaterAgent(model_against, "AGAINST", motion)

    # Create judge panel (10 independent judge-agents, one per model)
    panel = JudgePanel(motion)

    transcript: list[dict] = []

    def log(phase: str, msg: str):
        print(f"  [{phase}] {msg}")
        if on_phase:
            on_phase(phase, msg)

    # ──────────────────────────────────────────────
    # PHASE 1: Initial Votes (before any arguments)
    # ──────────────────────────────────────────────
    log("INIT", "Collecting initial votes from 10 judges...")
    initial_votes = await panel.collect_initial_votes()
    log("INIT", f"Initial votes collected: {_vote_summary(initial_votes)}")

    # ──────────────────────────────────────────────
    # PHASE 2: Opening Statements (parallel)
    # ──────────────────────────────────────────────
    log("OPENING", f"FOR ({model_for['display_name']}) generating opening...")
    log("OPENING", f"AGAINST ({model_against['display_name']}) generating opening...")

    opening_for, opening_against = await asyncio.gather(
        debater_for.generate(OPENING_PROMPT, max_tokens=600),
        debater_against.generate(OPENING_PROMPT, max_tokens=600),
    )

    transcript.append({"phase": "opening", "speaker": model_for["display_name"], "side": "FOR", "content": opening_for})
    transcript.append({"phase": "opening", "speaker": model_against["display_name"], "side": "AGAINST", "content": opening_against})
    log("OPENING", "Both opening statements complete.")

    # ──────────────────────────────────────────────
    # PHASE 3: Rebuttals (each sees opponent's opening)
    # ──────────────────────────────────────────────
    log("REBUTTAL", "Generating rebuttals...")

    rebuttal_for_text = await debater_for.generate(
        rebuttal_prompt(opening_against), max_tokens=500
    )
    transcript.append({"phase": "rebuttal", "speaker": model_for["display_name"], "side": "FOR", "content": rebuttal_for_text})

    rebuttal_against_text = await debater_against.generate(
        rebuttal_prompt(opening_for), max_tokens=500
    )
    transcript.append({"phase": "rebuttal", "speaker": model_against["display_name"], "side": "AGAINST", "content": rebuttal_against_text})
    log("REBUTTAL", "Both rebuttals complete.")

    # ──────────────────────────────────────────────
    # PHASE 4: Cross-Examination (3 rounds)
    # ──────────────────────────────────────────────
    for round_num in range(3):
        log("CROSS-EXAM", f"Round {round_num + 1}/3")
        tx = _format_transcript(transcript)

        # FOR asks AGAINST
        q_for = await debater_for.generate(
            cross_exam_question_prompt(tx), max_tokens=150
        )
        if not q_for or len(q_for.strip()) < 10:
            q_for = "What is the single strongest piece of evidence supporting your position, and how do you respond to the criticism that it is insufficient?"
        transcript.append({"phase": f"cross_exam_r{round_num+1}", "speaker": model_for["display_name"], "side": "FOR", "content": q_for, "type": "question"})

        a_against = await debater_against.generate(
            cross_exam_answer_prompt(q_for, tx, "AGAINST"), max_tokens=300
        )
        transcript.append({"phase": f"cross_exam_r{round_num+1}", "speaker": model_against["display_name"], "side": "AGAINST", "content": a_against, "type": "answer"})

        tx = _format_transcript(transcript)

        # AGAINST asks FOR
        q_against = await debater_against.generate(
            cross_exam_question_prompt(tx), max_tokens=150
        )
        if not q_against or len(q_against.strip()) < 10:
            q_against = "What is the single strongest piece of evidence supporting your position, and how do you respond to the criticism that it is insufficient?"
        transcript.append({"phase": f"cross_exam_r{round_num+1}", "speaker": model_against["display_name"], "side": "AGAINST", "content": q_against, "type": "question"})

        a_for = await debater_for.generate(
            cross_exam_answer_prompt(q_against, tx, "FOR"), max_tokens=300
        )
        transcript.append({"phase": f"cross_exam_r{round_num+1}", "speaker": model_for["display_name"], "side": "FOR", "content": a_for, "type": "answer"})

    log("CROSS-EXAM", "All 3 rounds complete.")

    # ──────────────────────────────────────────────
    # PHASE 5: Audience Questions
    # ──────────────────────────────────────────────
    log("AUDIENCE-Q", "Judges generating questions...")
    tx = _format_transcript(transcript)
    all_questions = await panel.collect_questions(tx)

    # Select up to 5 questions
    selected_questions = all_questions[:5]
    question_texts = [q["question"] for q in selected_questions]
    log("AUDIENCE-Q", f"Selected {len(question_texts)} questions, debaters answering...")

    # Both debaters answer all questions
    answers_for = await debater_for.generate(
        audience_answer_prompt(question_texts, tx, "FOR"), max_tokens=600
    )
    transcript.append({"phase": "audience_qa", "speaker": model_for["display_name"], "side": "FOR", "content": answers_for, "type": "answers"})

    answers_against = await debater_against.generate(
        audience_answer_prompt(question_texts, tx, "AGAINST"), max_tokens=600
    )
    transcript.append({"phase": "audience_qa", "speaker": model_against["display_name"], "side": "AGAINST", "content": answers_against, "type": "answers"})
    log("AUDIENCE-Q", "Audience Q&A complete.")

    # ──────────────────────────────────────────────
    # PHASE 6: Closing Statements
    # ──────────────────────────────────────────────
    log("CLOSING", "Generating closing statements...")
    tx = _format_transcript(transcript)

    closing_for_text, closing_against_text = await asyncio.gather(
        debater_for.generate(closing_prompt(tx), max_tokens=300),
        debater_against.generate(closing_prompt(tx), max_tokens=300),
    )

    transcript.append({"phase": "closing", "speaker": model_for["display_name"], "side": "FOR", "content": closing_for_text})
    transcript.append({"phase": "closing", "speaker": model_against["display_name"], "side": "AGAINST", "content": closing_against_text})
    log("CLOSING", "Both closing statements complete.")

    # ──────────────────────────────────────────────
    # PHASE 7: Final Votes
    # ──────────────────────────────────────────────
    log("VOTING", "Collecting final votes from 10 judges...")
    full_tx = _format_transcript(transcript)
    final_votes = await panel.collect_final_votes(full_tx)
    log("VOTING", f"Final votes: {_vote_summary(final_votes)}")

    # ──────────────────────────────────────────────
    # SCORING
    # ──────────────────────────────────────────────
    from benchmark.scoring import compute_debate_score
    score = compute_debate_score(initial_votes, final_votes, model_for["id"], model_against["id"])

    elapsed = time.time() - start_time
    metadata = {
        "elapsed_seconds": round(elapsed, 1),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    log("DONE", f"Debate complete in {elapsed:.0f}s — Winner: {score['winner_side']} ({score['winner_model_id']})")

    return DebateResult(
        debate_id=debate_id,
        motion=motion,
        model_for=model_for,
        model_against=model_against,
        transcript=transcript,
        initial_votes=initial_votes,
        final_votes=final_votes,
        audience_questions=selected_questions,
        score=score,
        metadata=metadata,
    )


def _vote_summary(votes: list[dict]) -> str:
    """Quick summary of votes for logging."""
    f = sum(1 for v in votes if v["stance"] == "FOR")
    a = sum(1 for v in votes if v["stance"] == "AGAINST")
    u = sum(1 for v in votes if v["stance"] == "UNDECIDED")
    avg_conf = sum(v["confidence"] for v in votes) / len(votes) if votes else 0
    return f"FOR={f} AGAINST={a} UNDECIDED={u} (avg confidence: {avg_conf:.0f})"
