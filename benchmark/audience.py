"""
AI² Benchmark — Judge/Audience Module

Each JudgeAgent is an independent brain instance (model + isolated context).
The same model can be both a debater-agent and a judge-agent in the same debate
because they have completely separate contexts.

A JudgePanel always has 10 judge-agents (one per model), regardless of who is debating.
"""

import asyncio
import json
import re

from benchmark.api_client import chat_completion
from benchmark.models import MODELS, PERSONA_MAP
from benchmark.prompts import (
    judge_vote_system,
    JUDGE_INITIAL_VOTE_PROMPT,
    judge_final_vote_prompt,
    judge_question_prompt,
)


class JudgeAgent:
    """A single judge agent — an isolated brain (model + context).

    Each JudgeAgent has its own system prompt (persona) and message history.
    It never shares context with the debater-agent using the same model,
    or with other judge-agents.
    """

    def __init__(self, model_config: dict, persona_name: str, motion: str):
        self.model = model_config
        self.persona_name = persona_name
        self.motion = motion
        self.system_prompt = judge_vote_system(persona_name, motion)

    async def initial_vote(self) -> dict:
        """Get the judge's pre-debate stance. Returns {stance, confidence, reasoning, judge_model_id}."""
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": JUDGE_INITIAL_VOTE_PROMPT},
        ]
        result = await chat_completion(
            model_id=self.model["openrouter_id"],
            messages=messages,
            max_tokens=200,
            config=self.model.get("config"),
            temperature=0.7,
            response_format={"type": "json_object"},
        )
        vote = _parse_vote(result["content"])
        vote["judge_model_id"] = self.model["id"]
        vote["persona"] = self.persona_name
        return vote

    async def final_vote(self, transcript: str) -> dict:
        """Get the judge's post-debate stance. Returns {stance, confidence, reasoning, judge_model_id}."""
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": judge_final_vote_prompt(transcript)},
        ]
        result = await chat_completion(
            model_id=self.model["openrouter_id"],
            messages=messages,
            max_tokens=300,
            config=self.model.get("config"),
            temperature=0.7,
            response_format={"type": "json_object"},
        )
        vote = _parse_vote(result["content"])
        vote["judge_model_id"] = self.model["id"]
        vote["persona"] = self.persona_name
        return vote

    async def generate_question(self, transcript: str) -> dict:
        """Generate a question for the debaters. Returns {question, judge_model_id}."""
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": judge_question_prompt(transcript)},
        ]
        result = await chat_completion(
            model_id=self.model["openrouter_id"],
            messages=messages,
            max_tokens=150,
            config=self.model.get("config"),
            temperature=0.8,
        )
        return {
            "question": result["content"].strip(),
            "judge_model_id": self.model["id"],
            "persona": self.persona_name,
        }


class JudgePanel:
    """Panel of 10 judge-agents, one per model.

    Always all 10 models, even if the model is also a debater —
    the judge-agent has a completely separate context from the debater-agent.
    """

    def __init__(self, motion: str):
        self.motion = motion
        self.agents: list[JudgeAgent] = []
        for model in MODELS:
            persona = PERSONA_MAP[model["id"]]
            self.agents.append(JudgeAgent(model, persona, motion))

    async def collect_initial_votes(self) -> list[dict]:
        """Run all 10 judges in parallel to get pre-debate stances."""
        tasks = [agent.initial_vote() for agent in self.agents]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        votes = []
        for i, r in enumerate(results):
            if isinstance(r, Exception):
                print(f"  ⚠ Judge {self.agents[i].model['id']} initial vote failed: {r}")
                votes.append({
                    "stance": "UNDECIDED",
                    "confidence": 50,
                    "reasoning": f"Error: {str(r)}",
                    "judge_model_id": self.agents[i].model["id"],
                    "persona": self.agents[i].persona_name,
                    "error": True,
                })
            else:
                votes.append(r)
        return votes

    async def collect_questions(self, transcript: str) -> list[dict]:
        """Each judge generates one question. Returns list of {question, judge_model_id}."""
        tasks = [agent.generate_question(transcript) for agent in self.agents]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        questions = []
        for i, r in enumerate(results):
            if isinstance(r, Exception):
                print(f"  ⚠ Judge {self.agents[i].model['id']} question failed: {r}")
            else:
                questions.append(r)
        return questions

    async def collect_final_votes(self, transcript: str) -> list[dict]:
        """Run all 10 judges in parallel to get post-debate stances."""
        tasks = [agent.final_vote(transcript) for agent in self.agents]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        votes = []
        for i, r in enumerate(results):
            if isinstance(r, Exception):
                print(f"  ⚠ Judge {self.agents[i].model['id']} final vote failed: {r}")
                votes.append({
                    "stance": "UNDECIDED",
                    "confidence": 50,
                    "reasoning": f"Error: {str(r)}",
                    "judge_model_id": self.agents[i].model["id"],
                    "persona": self.agents[i].persona_name,
                    "error": True,
                })
            else:
                votes.append(r)
        return votes


def _parse_vote(content: str) -> dict:
    """Parse a JSON vote from model output, with fallback extraction."""
    if not content or content.strip() == "":
        return {"stance": "UNDECIDED", "confidence": 50, "reasoning": "No response"}

    # Try direct JSON parse
    try:
        data = json.loads(content.strip())
        return _validate_vote(data)
    except json.JSONDecodeError:
        pass

    # Try to extract JSON from markdown code blocks
    json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content, re.DOTALL)
    if json_match:
        try:
            data = json.loads(json_match.group(1))
            return _validate_vote(data)
        except json.JSONDecodeError:
            pass

    # Try to find any JSON object in the text
    json_match = re.search(r'\{[^{}]*"stance"[^{}]*\}', content, re.DOTALL)
    if json_match:
        try:
            data = json.loads(json_match.group(0))
            return _validate_vote(data)
        except json.JSONDecodeError:
            pass

    # Fallback: try to extract stance from text
    content_upper = content.upper()
    if "FOR" in content_upper and "AGAINST" not in content_upper:
        stance = "FOR"
    elif "AGAINST" in content_upper:
        stance = "AGAINST"
    else:
        stance = "UNDECIDED"

    return {
        "stance": stance,
        "confidence": 50,
        "reasoning": content[:200],
        "parse_fallback": True,
    }


def _validate_vote(data: dict) -> dict:
    """Validate and normalize a vote dict."""
    stance = str(data.get("stance", "UNDECIDED")).upper().strip()
    if stance not in ("FOR", "AGAINST", "UNDECIDED"):
        stance = "UNDECIDED"

    confidence = data.get("confidence", 50)
    try:
        confidence = int(confidence)
        confidence = max(0, min(100, confidence))
    except (ValueError, TypeError):
        confidence = 50

    reasoning = str(data.get("reasoning", ""))[:500]

    return {
        "stance": stance,
        "confidence": confidence,
        "reasoning": reasoning,
    }
