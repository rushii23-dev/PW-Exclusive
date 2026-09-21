# ClearClause

**Understand what you're signing.** ClearClause is a GenAI legal assistant that turns a lease, job offer, freelance contract or terms of service into plain language — in the reader's own language — flags the clauses that cost people money, catches contradictions, lays out their options, and prepares them for a conversation with a lawyer.

It is built on one rule: **no quote, no claim.** A deterministic engine establishes the facts, Google Gemini explains them, and every quote Gemini shows the reader is checked against the document before it is displayed.

> ClearClause provides information, not legal advice. It helps people arrive at a professional's desk prepared; it does not replace that professional.

---

## What it does

Every use case in the brief, and a few beyond it:

| Problem statement asks for | ClearClause |
|---|---|
| Simplifying complex legal documents | Clause-by-clause plain-language breakdown, a Gemini-written brief, and **"Explain this clause simply"** on any clause |
| Comparing contracts, agreements or policies | **Compare** two documents: topic coverage, risks only one has, numbers side by side, and a Gemini verdict on the trade-offs *for you* |
| Highlighting clauses, obligations, risks, **inconsistencies** | Risk flags with the exact triggering words; "what this requires of you"; **contradiction detection** by rules *and* by Gemini, each quoting both sides |
| Answering questions from the document | **Ask the document** — Gemini answers in any language, citing and quoting clauses; says plainly when the document is silent |
| Understanding options and next steps | **Your options** — describe your situation in your own words; get the routes the document allows, what each costs, the clauses behind them, and next steps |
| Summaries, checklists, actionable outputs | Brief with top concerns, before-you-sign checklist, copy-as-text and print/PDF export |
| Preparing questions for a legal professional | Generated questions for a lawyer — per document, per clause and per situation |

**Access beyond English and beyond pasted text**

- **12 languages** for every explanation: English, Hindi, Marathi, Bengali, Tamil, Telugu, Kannada, Gujarati, Malayalam, Punjabi, Urdu, Spanish. Quotes are never translated, so they still match the paper.
- **Upload a PDF, a Word file, or a phone photo** of the document. Text PDFs and `.docx` files are read directly; scans and photos are read by Gemini's vision.
- **52-term legal glossary**, defined by what each term does to you.

---

## How GenAI is used — safely

```
 document ──► rule engine ──► facts: clauses, risk flags, amounts, dates,
                 (deterministic)   duties, contradictions
                        │
                        ▼
                     Gemini  ──► brief · answers · clause explanations ·
                        │         options · contradictions · comparison verdict
                        ▼
              grounding check ──► every cited clause must exist, every quote
                                  must appear verbatim in that clause
                        │
                        ▼
                     reader     (unverifiable output is dropped; the rule
                                 engine answers instead)
```

- **Structured output only.** Every Gemini call requests JSON against a schema and is validated with zod before use.
- **Citations are verified, not trusted.** Quotes are normalised (quote marks, dashes, whitespace) and matched against the cited clause. An answer or option without verified support never reaches the reader.
- **Prompt-injection resistant.** The document is wrapped as untrusted data; the system prompt forbids following instructions inside it.
- **Honest about gaps.** "The document doesn't say" is a first-class answer, and the UI only claims Gemini checked for contradictions when that check actually completed.
- **Never breaks.** If Gemini is unavailable, slow or wrong, every feature falls back to the rule engine. With no API key at all, analysis, Q&A, options and comparison still work.
- **Private.** Documents are processed in memory and never stored or logged. No accounts, no analytics on content. Strict CSP, `no-store` on API responses, rate limiting, size caps.

---

## Run it locally

Requires Node.js 20+.

```bash
npm install
cp .env.example .env.local   # then paste your Gemini API key into it
npm run dev
```

Open http://localhost:3000. Get a free Gemini key at [Google AI Studio](https://aistudio.google.com/apikey).

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | For AI features | Google Gemini API key |
| `GEMINI_MODEL` | No | Override the model (default `gemini-3.5-flash`) |

## Test

```bash
npm test          # 178 tests: engine, AI grounding, API routes, file reading
npm run typecheck
npm run lint
```

The AI tests run against a stand-in for the Gemini SDK, so they need no key. They include adversarial cases: invented quotes, citations to clauses that don't exist, malformed JSON, API failures and timeouts — confirming none of it reaches the reader.

## Deploy

**Google Cloud Run** (container, uses the included `Dockerfile`):

```bash
gcloud run deploy clearclause --source . --region asia-south1 \
  --allow-unauthenticated --set-env-vars GEMINI_API_KEY=YOUR_KEY
```

**Vercel:** import the repository, add `GEMINI_API_KEY` as an environment variable, deploy.

---

## API

| Route | Purpose |
|---|---|
| `POST /api/analyze` | Full analysis; with Gemini, adds the brief and a contradiction read |
| `POST /api/ask` | Grounded question answering |
| `POST /api/explain` | Deep explanation of one clause, with fairer wording |
| `POST /api/options` | Options and next steps for a described situation |
| `POST /api/compare` | Two-document comparison with a Gemini verdict |
| `POST /api/extract` | Text from PDF, Word, image or text uploads (≤ 4 MB) |
| `GET /api/health` | Liveness and whether Gemini is configured (never the key) |

The AI routes (`analyze`, `ask`, `explain`, `options`, `compare`) accept an optional `language` code (`en`, `hi`, `mr`, `bn`, `ta`, `te`, `kn`, `gu`, `ml`, `pa`, `ur`, `es`).

## Tech

Next.js (App Router) · TypeScript · Tailwind CSS · Google Gen AI SDK (`@google/genai`) · zod · unpdf · mammoth · Vitest

## Limits, stated plainly

- Not legal advice, and not a verdict of fairness — a clean report can still miss a clause drafted in a novel way.
- AI explanations can be imperfect even when their quotes are verified; the quoted clause is always shown alongside so you can check.
- Jurisdiction-agnostic: it explains what a clause says, not whether it is enforceable where you live.
- Text read from photos and scans can contain errors; review it before analysing.
