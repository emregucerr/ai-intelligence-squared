# AI² — Artificial Intelligence Squared

> LLM Debate Benchmark: The top 10 frontier AI models debate head-to-head in Intelligence Squared format, judged by AI jury panels.

<img alt="AI² Hero Banner" src="web/public/images/hero-banner.png" width="100%" />

## 🏗 Architecture

### Models vs Agents

A **model** is a type of brain (e.g., Claude Opus 4.6). An **agent** is a brain instance with its own isolated context. The same model can power multiple agents simultaneously — what matters is that each agent has completely separate context.

In each debate:
- **2 debater-agents**: argue FOR and AGAINST the motion
- **10 judge-agents**: one per model (including the debaters), each with isolated evaluator context and a unique persona

### Debate Format (Intelligence Squared)

1. **Opening Statements** — Each debater frames their position (600 tokens)
2. **Rebuttals** — Respond to opponent's opening, attack assumptions (500 tokens)
3. **Cross-Examination** — 3 rounds of Q&A between debaters (150/300 tokens)
4. **Audience Questions** — Judges generate questions, debaters answer (300 tokens)
5. **Closing Statements** — Compress strongest points, no new arguments (300 tokens)

### Scoring

- 10 judges vote before and after the debate
- Winner = side with the highest **vote conversion** (Δ = final% − initial%)
- Confidence-weighted persuasion tracked for soft signal
- ELO ratings updated after each matchup (K=32)

## 🏆 Top 10 Models

| # | Model | Provider | Arena Score |
|---|-------|----------|-------------|
| 1 | Claude Opus 4.6 (Thinking) | Anthropic | 1503 |
| 2 | Claude Opus 4.6 | Anthropic | 1497 |
| 3 | Gemini 3.1 Pro Preview | Google | 1493 |
| 4 | Grok 4.20 | xAI | 1490 |
| 5 | Gemini 3 Pro | Google | 1486 |
| 6 | GPT-5.4 (High) | OpenAI | 1484 |
| 7 | Grok 4.20 (Reasoning) | xAI | 1480 |
| 8 | GPT-5.2 Chat | OpenAI | 1477 |
| 9 | Grok 4.20 Multi-Agent | xAI | 1475 |
| 10 | Gemini 3 Flash | Google | 1474 |

## 📊 Judge Persona Map

Each model gets a fixed persona when acting as a judge:

| Model | Judge Persona |
|-------|--------------|
| Claude Opus 4.6 (Thinking) | Risk-averse economist |
| Claude Opus 4.6 | Philosophy professor |
| Gemini 3.1 Pro Preview | Neutral academic |
| Grok 4.20 | Contrarian thinker |
| Gemini 3 Pro | Environmental activist |
| GPT-5.4 (High) | Corporate executive |
| Grok 4.20 (Reasoning) | Skeptical policymaker |
| GPT-5.2 Chat | Optimistic technologist |
| Grok 4.20 Multi-Agent | Union labor representative |
| Gemini 3 Flash | Data scientist & AI researcher |

## 🚀 Getting Started

### Prerequisites

- Node.js 22+
- Python 3.12+
- OpenRouter API key

### Run the Web App

```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000

### Run the Benchmark

```bash
# Set your API key
export OPENROUTER_API_KEY=sk-or-v1-...

# Install dependencies
pip install aiohttp python-dotenv

# Run tests first
python3 -m benchmark.test_debate

# Run full benchmark (45 matchups)
python3 -m benchmark.runner

# Sync results to web app
./sync_results.sh
```

### Live Arena

Visit the `/arena` page to:
1. Enter your OpenRouter API key
2. Select two models
3. Choose a topic
4. Watch the debate unfold in real-time with SSE streaming

## 📁 Project Structure

```
├── benchmark/               # Python benchmark engine
│   ├── models.py           # Model definitions & configs
│   ├── prompts.py          # All prompt templates
│   ├── api_client.py       # OpenRouter API wrapper
│   ├── audience.py         # Judge agent module
│   ├── debate.py           # Debate orchestration
│   ├── scoring.py          # ELO & scoring
│   ├── runner.py           # Full benchmark runner
│   └── test_debate.py      # Step-by-step tests
├── web/                    # Next.js web application
│   ├── src/app/            # App Router pages
│   ├── src/components/     # React components
│   ├── src/lib/            # Types, utils, data
│   └── public/images/      # Generated model icons
└── sync_results.sh         # Sync benchmark → web app
```

## ☁️ Deploy to Vercel

The recommended way to deploy AI² is on [Vercel](https://vercel.com), which natively supports Next.js.

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/YOUR_REPO&root-directory=web)

### Manual Deploy

1. **Install the Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy from the `web/` directory**:
   ```bash
   cd web
   vercel
   ```
   Follow the prompts. Vercel auto-detects Next.js and uses `npm run build`.

3. **Deploy to production**:
   ```bash
   vercel --prod
   ```

### Configuration Details

- **Root Directory**: Set to `web` in Vercel project settings (or pass `--cwd web` via CLI). The Next.js app lives in `web/`, not the repo root.
- **Framework Preset**: Next.js (auto-detected).
- **Build Command**: `npm run build` (default).
- **Output Directory**: `.next` (default).
- **Node.js Version**: 22.x (set in Vercel project settings under General > Node.js Version).

### Live Arena API Endpoint

The `/api/debate` route is a serverless function that orchestrates live debates via SSE streaming. It makes many sequential calls to the OpenRouter API, so it requires an extended execution timeout:

- **`maxDuration: 800`** (~13 minutes) is configured in both `vercel.json` and as a route segment export. This requires a **Vercel Pro plan** or higher. On the free Hobby plan, the max is 60 seconds, which is too short for a full debate.
- The route uses `runtime: "nodejs"` and `dynamic: "force-dynamic"` to ensure it always runs as a serverless function, never statically cached.
- No environment variables are needed on Vercel — the user's OpenRouter API key is passed per-request from the browser and never stored server-side.

### Vercel Plan Requirements

| Feature | Hobby (Free) | Pro | Enterprise |
|---------|-------------|-----|------------|
| Static pages | ✅ | ✅ | ✅ |
| Live Arena (short debates) | ⚠️ 60s limit | ✅ | ✅ |
| Live Arena (full debates) | ❌ Too slow | ✅ 800s | ✅ 900s |

## 🔬 Unique Analytics

- **Self-judging bias**: Does a model favor itself when it's both debater and judge?
- **Provider bias**: Do models systematically favor their own provider's models?
- **Cross-model matrix**: 10×10 grid showing every judge×debater relationship
- **Persuasion resistance**: Which models are hardest to convince as judges?
- **Stance flip rate**: How often each judge changes position after a debate

## 📄 License

MIT
