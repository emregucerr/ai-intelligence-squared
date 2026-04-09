"""
AI² Benchmark — OpenRouter API Client

Async wrapper around the OpenRouter chat completions API with retry logic,
rate-limit handling, and cost tracking.
"""

import asyncio
import json
import os
import time
from dataclasses import dataclass, field

import aiohttp


@dataclass
class APIStats:
    """Track cumulative API usage across the benchmark run."""
    total_requests: int = 0
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    total_cost: float = 0.0
    errors: int = 0
    retries: int = 0


# Global stats tracker
stats = APIStats()

# Rate-limit: max concurrent requests per model to avoid 429s
_semaphores: dict[str, asyncio.Semaphore] = {}
_global_semaphore: asyncio.Semaphore | None = None

API_BASE = "https://openrouter.ai/api/v1/chat/completions"


def _get_api_key() -> str:
    key = os.environ.get("OPENROUTER_API_KEY", "")
    if not key:
        raise RuntimeError("OPENROUTER_API_KEY environment variable not set")
    return key


def _get_semaphore(model_id: str) -> asyncio.Semaphore:
    """Per-model semaphore to limit concurrency (avoid rate limits)."""
    if model_id not in _semaphores:
        _semaphores[model_id] = asyncio.Semaphore(2)  # max 2 concurrent per model
    return _semaphores[model_id]


def get_global_semaphore() -> asyncio.Semaphore:
    """Global semaphore to limit total concurrent requests."""
    global _global_semaphore
    if _global_semaphore is None:
        _global_semaphore = asyncio.Semaphore(10)  # max 10 total concurrent (3 parallel debates)
    return _global_semaphore


async def chat_completion(
    model_id: str,
    messages: list[dict],
    max_tokens: int = 800,
    config: dict | None = None,
    temperature: float = 0.7,
    response_format: dict | None = None,
    timeout: float = 120.0,
    api_key: str | None = None,
) -> dict:
    """
    Make a chat completion request to OpenRouter.

    Args:
        model_id: OpenRouter model ID (e.g., "anthropic/claude-opus-4.6")
        messages: List of message dicts with "role" and "content"
        max_tokens: Maximum tokens in the response
        config: Extra model config (e.g., {"reasoning": {"effort": "high"}})
        temperature: Sampling temperature
        response_format: Optional response format (e.g., {"type": "json_object"})
        timeout: Request timeout in seconds
        api_key: Optional API key override (for user-provided keys)

    Returns:
        dict with keys: content, usage, model, raw_response
    """
    key = api_key or _get_api_key()

    payload = {
        "model": model_id,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }

    # Merge extra config (e.g., reasoning settings)
    if config:
        payload.update(config)

    if response_format:
        payload["response_format"] = response_format

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {key}",
        "HTTP-Referer": "https://ai-squared-benchmark.vercel.app",
        "X-Title": "AI² Intelligence Squared Benchmark",
    }

    model_sem = _get_semaphore(model_id)
    global_sem = get_global_semaphore()

    max_retries = 4
    base_delay = 2.0

    for attempt in range(max_retries + 1):
        async with global_sem:
            async with model_sem:
                try:
                    async with aiohttp.ClientSession() as session:
                        async with session.post(
                            API_BASE,
                            json=payload,
                            headers=headers,
                            timeout=aiohttp.ClientTimeout(total=timeout),
                        ) as resp:
                            body = await resp.json()

                            # Handle rate limits
                            if resp.status == 429:
                                delay = base_delay * (2 ** attempt)
                                stats.retries += 1
                                print(f"  ⚠ Rate limited on {model_id}, retrying in {delay}s...")
                                await asyncio.sleep(delay)
                                continue

                            # Handle other errors
                            if resp.status != 200:
                                error_msg = body.get("error", {}).get("message", str(body))
                                if attempt < max_retries:
                                    delay = base_delay * (2 ** attempt)
                                    stats.retries += 1
                                    print(f"  ⚠ Error {resp.status} on {model_id}: {error_msg}, retrying in {delay}s...")
                                    await asyncio.sleep(delay)
                                    continue
                                stats.errors += 1
                                raise RuntimeError(f"API error {resp.status} for {model_id}: {error_msg}")

                            # Extract response
                            choice = body.get("choices", [{}])[0]
                            message = choice.get("message", {})
                            content = message.get("content", "")
                            usage = body.get("usage", {})

                            # Update stats
                            stats.total_requests += 1
                            stats.total_input_tokens += usage.get("prompt_tokens", 0)
                            stats.total_output_tokens += usage.get("completion_tokens", 0)

                            return {
                                "content": content,
                                "usage": usage,
                                "model": body.get("model", model_id),
                                "finish_reason": choice.get("finish_reason", ""),
                            }

                except asyncio.TimeoutError:
                    if attempt < max_retries:
                        delay = base_delay * (2 ** attempt)
                        stats.retries += 1
                        print(f"  ⚠ Timeout on {model_id} (attempt {attempt+1}), retrying in {delay}s...")
                        await asyncio.sleep(delay)
                        continue
                    stats.errors += 1
                    raise RuntimeError(f"Timeout after {max_retries+1} attempts for {model_id}")

                except aiohttp.ClientError as e:
                    if attempt < max_retries:
                        delay = base_delay * (2 ** attempt)
                        stats.retries += 1
                        print(f"  ⚠ Connection error on {model_id}: {e}, retrying in {delay}s...")
                        await asyncio.sleep(delay)
                        continue
                    stats.errors += 1
                    raise

    # Should not reach here
    raise RuntimeError(f"Exhausted retries for {model_id}")


def print_stats():
    """Print cumulative API usage statistics."""
    print(f"\n{'='*50}")
    print(f"API Usage Statistics")
    print(f"{'='*50}")
    print(f"Total requests:      {stats.total_requests}")
    print(f"Total input tokens:  {stats.total_input_tokens:,}")
    print(f"Total output tokens: {stats.total_output_tokens:,}")
    print(f"Retries:             {stats.retries}")
    print(f"Errors:              {stats.errors}")
    print(f"{'='*50}")
