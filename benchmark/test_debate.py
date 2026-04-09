#!/usr/bin/env python3
"""
AI² Benchmark — Step-by-Step Test Script

Tests each component individually before running the full benchmark.
Run from workspace root: python -m benchmark.test_debate
"""

import asyncio
import json
import os
import sys
import time

# Load env
from dotenv import load_dotenv
load_dotenv(override=True)

from benchmark.models import MODELS, PERSONA_MAP, TOPICS, get_model_by_id
from benchmark.api_client import chat_completion, print_stats, stats
from benchmark.audience import JudgeAgent, JudgePanel
from benchmark.scoring import compute_debate_score, compute_elo_update, EloTracker


async def test_1_api_connectivity():
    """Test 1: Verify API connectivity with cheapest model."""
    print("\n" + "="*60)
    print("TEST 1: API Connectivity (Gemini 3 Flash — cheapest)")
    print("="*60)

    model = get_model_by_id("gemini-3-flash")
    result = await chat_completion(
        model_id=model["openrouter_id"],
        messages=[{"role": "user", "content": "Say 'API working' in exactly 2 words."}],
        max_tokens=20,
        config=model.get("config"),
    )
    print(f"  Response: {result['content']}")
    print(f"  Tokens: {result['usage']}")
    assert result["content"], "Empty response!"
    print("  ✅ PASSED")
    return True


async def test_2_all_models_respond():
    """Test 2: Quick ping to all 10 models to verify they work."""
    print("\n" + "="*60)
    print("TEST 2: All 10 Models Respond")
    print("="*60)

    async def ping(model):
        try:
            t0 = time.time()
            result = await chat_completion(
                model_id=model["openrouter_id"],
                messages=[{"role": "user", "content": "Reply with just the word 'OK'."}],
                max_tokens=50,
                config=model.get("config"),
                timeout=60.0,
            )
            elapsed = time.time() - t0
            content = (result["content"] or "").strip()[:50]
            print(f"  ✅ {model['display_name']:35s} ({elapsed:.1f}s): {content}")
            return True
        except Exception as e:
            print(f"  ❌ {model['display_name']:35s}: {e}")
            return False

    results = await asyncio.gather(*[ping(m) for m in MODELS])
    passed = sum(results)
    print(f"\n  {passed}/10 models responded successfully")
    return passed >= 8  # Allow 2 failures


async def test_3_judge_vote():
    """Test 3: Single judge agent produces valid JSON vote."""
    print("\n" + "="*60)
    print("TEST 3: Judge Agent Vote (Gemini 3 Flash)")
    print("="*60)

    model = get_model_by_id("gemini-3-flash")
    persona = PERSONA_MAP["gemini-3-flash"]
    motion = TOPICS[0]

    agent = JudgeAgent(model, persona, motion)
    vote = await agent.initial_vote()

    print(f"  Persona: {persona}")
    print(f"  Motion: {motion}")
    print(f"  Vote: {json.dumps(vote, indent=2)}")

    assert vote["stance"] in ("FOR", "AGAINST", "UNDECIDED"), f"Bad stance: {vote['stance']}"
    assert 0 <= vote["confidence"] <= 100, f"Bad confidence: {vote['confidence']}"
    assert vote["judge_model_id"] == "gemini-3-flash"
    print("  ✅ PASSED")
    return True


async def test_4_judge_panel_initial_votes():
    """Test 4: Full 10-judge panel collects initial votes."""
    print("\n" + "="*60)
    print("TEST 4: Full Judge Panel (10 judges, initial votes)")
    print("="*60)

    motion = TOPICS[0]
    panel = JudgePanel(motion)
    votes = await panel.collect_initial_votes()

    print(f"  Motion: {motion}")
    print(f"  Votes collected: {len(votes)}")
    for v in votes:
        print(f"    {v['judge_model_id']:35s} [{v['persona']:30s}]: {v['stance']:10s} (conf: {v['confidence']})")

    assert len(votes) == 10, f"Expected 10 votes, got {len(votes)}"
    for_count = sum(1 for v in votes if v["stance"] == "FOR")
    against_count = sum(1 for v in votes if v["stance"] == "AGAINST")
    undecided_count = sum(1 for v in votes if v["stance"] == "UNDECIDED")
    print(f"\n  Summary: FOR={for_count} AGAINST={against_count} UNDECIDED={undecided_count}")
    print("  ✅ PASSED")
    return True


async def test_5_mini_debate():
    """Test 5: Run a complete mini-debate between the two cheapest models."""
    print("\n" + "="*60)
    print("TEST 5: Full Mini-Debate (Gemini 3 Flash vs GPT-5.2 Chat)")
    print("="*60)

    from benchmark.debate import run_debate

    model_for = get_model_by_id("gemini-3-flash")
    model_against = get_model_by_id("gpt-5.2-chat")
    motion = TOPICS[0]

    print(f"  FOR:     {model_for['display_name']}")
    print(f"  AGAINST: {model_against['display_name']}")
    print(f"  Motion:  {motion}")
    print()

    result = await run_debate(model_for, model_against, motion, debate_id="test-001")

    # Print results
    print(f"\n  {'='*40}")
    print(f"  RESULTS")
    print(f"  {'='*40}")
    print(f"  Winner: {result.score['winner_side']} ({result.score['winner_model_id']})")
    print(f"  Initial votes: FOR={result.score['initial']['for']} AGAINST={result.score['initial']['against']} UNDECIDED={result.score['initial']['undecided']}")
    print(f"  Final votes:   FOR={result.score['final']['for']} AGAINST={result.score['final']['against']} UNDECIDED={result.score['final']['undecided']}")
    print(f"  Delta FOR:     {result.score['delta_for']:+.1f}%")
    print(f"  Delta AGAINST: {result.score['delta_against']:+.1f}%")
    print(f"  Persuasion FOR:     {result.score['persuasion_for']:+d}")
    print(f"  Persuasion AGAINST: {result.score['persuasion_against']:+d}")
    print(f"  Elapsed: {result.metadata['elapsed_seconds']}s")
    print(f"  Transcript entries: {len(result.transcript)}")

    # Save result for inspection
    os.makedirs("benchmark/results/debates", exist_ok=True)
    with open("benchmark/results/debates/test-001.json", "w") as f:
        json.dump(result.to_dict(), f, indent=2)
    print(f"  Saved to benchmark/results/debates/test-001.json")

    print("  ✅ PASSED")
    return True


async def test_6_scoring():
    """Test 6: Verify scoring logic with mock data."""
    print("\n" + "="*60)
    print("TEST 6: Scoring Logic (Mock Data)")
    print("="*60)

    initial = [
        {"stance": "FOR", "confidence": 60, "judge_model_id": "a"},
        {"stance": "AGAINST", "confidence": 70, "judge_model_id": "b"},
        {"stance": "UNDECIDED", "confidence": 40, "judge_model_id": "c"},
        {"stance": "FOR", "confidence": 55, "judge_model_id": "d"},
        {"stance": "AGAINST", "confidence": 80, "judge_model_id": "e"},
    ]
    final = [
        {"stance": "FOR", "confidence": 75, "judge_model_id": "a"},
        {"stance": "FOR", "confidence": 60, "judge_model_id": "b"},  # flipped!
        {"stance": "FOR", "confidence": 65, "judge_model_id": "c"},  # converted!
        {"stance": "FOR", "confidence": 70, "judge_model_id": "d"},
        {"stance": "AGAINST", "confidence": 85, "judge_model_id": "e"},
    ]

    score = compute_debate_score(initial, final, "model_x", "model_y")
    print(f"  Winner: {score['winner_side']} (model: {score['winner_model_id']})")
    print(f"  Delta FOR: {score['delta_for']:+.1f}%")
    print(f"  Delta AGAINST: {score['delta_against']:+.1f}%")
    print(f"  Persuasion FOR: {score['persuasion_for']}")

    assert score["winner_side"] == "FOR", f"Expected FOR to win, got {score['winner_side']}"
    assert score["winner_model_id"] == "model_x"
    assert score["delta_for"] > 0

    # Test ELO
    new_a, new_b = compute_elo_update(1500, 1500, "a")
    print(f"\n  ELO test: 1500 vs 1500, A wins → A={new_a}, B={new_b}")
    assert new_a > 1500
    assert new_b < 1500

    print("  ✅ PASSED")
    return True


async def main():
    """Run all tests sequentially."""
    print("🏁 AI² Benchmark — Test Suite")
    print(f"   API Key: ...{os.environ.get('OPENROUTER_API_KEY', '')[-6:]}")
    print()

    tests = [
        ("Test 1: API Connectivity", test_1_api_connectivity),
        ("Test 2: All Models Respond", test_2_all_models_respond),
        ("Test 3: Judge Vote", test_3_judge_vote),
        ("Test 4: Full Judge Panel", test_4_judge_panel_initial_votes),
        ("Test 5: Mini Debate", test_5_mini_debate),
        ("Test 6: Scoring Logic", test_6_scoring),
    ]

    results = {}
    for name, test_fn in tests:
        try:
            passed = await test_fn()
            results[name] = "✅ PASSED" if passed else "⚠️ PARTIAL"
        except Exception as e:
            print(f"  ❌ FAILED: {e}")
            import traceback
            traceback.print_exc()
            results[name] = f"❌ FAILED: {e}"

    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    for name, status in results.items():
        print(f"  {name}: {status}")

    print_stats()


if __name__ == "__main__":
    asyncio.run(main())
