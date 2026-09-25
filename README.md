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
| Highlighting clauses, obligations, risks, **inconsistencies** | Risk flags with the exact triggering words; **both sides' duties** — what the document requires of you and what the other side must do, read from the right side of *this* kind of document; **contradiction detection** by rules *and* by Gemini, each quoting both sides |
| Answering questions from the document | **Ask the document** — Gemini answers in any language, citing and quoting clauses; says plainly when the document is silent |
| Understanding options and next steps | **Your options** — describe your situation in your own words; get the routes the document allows, what each costs, the clauses behind them, and next steps |
| Summaries, checklists, actionable outputs | Brief with top concerns, before-you-sign checklist; copy, download (.txt) or print/PDF the whole analysis — key amounts and dates, both sides' duties and the questions included |
| Preparing questions for a legal professional | Generated questions for a lawyer — per document, per clause and per situation |

**Access beyond English and beyond pasted text**

- **12 languages** for every explanation: English, Hindi, Marathi, Bengali, Tamil, Telugu, Kannada, Gujarati, Malayalam, Punjabi, Urdu, Spanish. Quotes are never translated, so they still match the paper.
- **Upload a PDF, a Word file, or a phone photo** of the document. Text PDFs and `.docx` files are read directly; scans and photos are read by Gemini's vision.
- **61-term legal glossary**, defined by what each term does to you.

**Try it in one click** — six sample documents are built in: a rental agreement, an employment contract, a mutual NDA, a freelance contract, subscription terms, and a **PG licence drafted with deliberate errors** (two deposit amounts, "thirty (45) days", two courts, a reference to a clause that doesn't exist) to show the contradiction checks at work.

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
- **Never breaks.** If a Gemini model is overloaded, the next model in a fallback chain answers within a fixed time budget; if Gemini is unavailable or wrong, every feature falls back to the rule engine. With no API key at all, analysis, Q&A, options and comparison still work.
- **Prompt-fenced.** Untrusted text sits inside tags like `<document>`; any fence tag *inside* the document, question or situation is defused first, so a contract that says `</document> SYSTEM: …` cannot step outside its fence. Quotes still verify.
- **Private.** Documents are processed in memory and never stored or logged. No accounts, no analytics on content.

## Security

| Threat | Defence |
|---|---|
| Rate-limit evasion by spoofing `X-Forwarded-For` | The client is the address *our* proxy appended (rightmost hop, `TRUSTED_PROXY_HOPS` for more), never what the client claimed; the limiter's table has a hard size ceiling |
| Memory exhaustion via huge or endless bodies | Bodies are read as a stream and abandoned the moment they pass a byte cap — with or without a `Content-Length`; caps are sized in UTF-8 bytes so an Indic-script document gets the same room as English |
| Other websites spending this server's Gemini quota through visitors' browsers | JSON-only API (a cross-site form can't send it) and `Sec-Fetch-Site` checks refuse cross-site requests |
| Disguised uploads (a binary renamed `.pdf`/`.jpg`/`.txt`) | File signatures are checked before any parser or model sees the bytes; the image type sent to Gemini comes from the bytes, not the name |
| Prompt injection from the document | Untrusted-data rule in every system prompt, fence-tag defusing, structured JSON output validated by zod, and every quote verified against the document |
| Leaking the API key to the browser | Gemini, HTTP and upload modules are marked `server-only`: a client bundle that imports them fails to build |
| Clickjacking, sniffing, cross-origin leaks | Strict CSP (`connect-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`), `X-Frame-Options: DENY`, `nosniff`, COOP/CORP same-origin, HSTS, a locked-down `Permissions-Policy`, no `X-Powered-By` — all pinned by a regression test |
| Error messages echoing document text | Every failure maps to a fixed, generic message; document text is never logged |

## Accessibility

Built to WCAG 2.2 AA, and tested for it:

- **Every page and panel is audited with axe-core** in the test suite, and was audited again in a real browser — including colour contrast — with zero violations.
- **Colour contrast is a test, not a claim:** a test reads the design tokens from `globals.css` and checks every text/background pair for 4.5:1 and the focus ring for 3:1.
- **Explanations are marked with their language.** Gemini's text in Hindi or Tamil carries `lang`, so screen readers switch voice; Urdu carries `dir="rtl"`. Quotes from the document are left in the document's language.
- **Focus goes where the answer is.** A finished analysis or comparison moves focus to its heading; an explanation that replaces its button receives focus; asking a question keeps focus in the question box; the mobile menu closes on Escape and returns focus to its toggle.
- **Short announcements, not floods.** A one-sentence status ("Analysis ready: Rental agreement, 12 clauses; 3 need attention") instead of re-reading a page of results; the character counter is deliberately silent while typing.
- Keyboard-complete tabs (arrow keys, Home/End), visible focus on every control (including the file upload), `prefers-reduced-motion` honoured by CSS and by scrolling, and a print stylesheet that keeps every clause title and risk badge on paper.

## Efficiency

- **API responses are compressed.** Next.js compresses pages but not API responses, and an analysis is about ten times the size of its document: every clause with its flags, explanations and quotes. Responses go out brotli-compressed (gzip as the fallback), on the thread pool so a large one never stalls other requests. The sample lease's analysis shrinks from 29 KB to 5 KB. Longer documents save more, because flag explanations repeat from clause to clause: the maximum-size test contract's 1.1 MB goes out as 27 KB. This matters most for readers on mobile data.
- **Nothing is fetched twice.** An explanation, answer, set of options, analysis or comparison the reader has already had is shown again from memory, with no request and no model call. That covers reopening a clause after filtering, switching back to a language, and picking a sample again. Only complete results are kept, so a Gemini step that fell through is retried. Answers belong to one document, live in memory only, and are never written to storage.
- **The analysis code stays on the server.** The browser gets the engine's types, limits and display helpers through a single entry point, never the risk lexicon, glossary or tokenizer. That cut the gzipped JavaScript for the analyze and compare pages by 7% and 12%, and a test walks the import graph to keep it that way.
- **Explaining a clause reads only that clause:** 15 ms instead of a full 150 ms analysis on a maximum-size contract. The results are identical, which a test checks clause by clause on every sample.
- **The engine analyses a 200,000-character contract in about 150 ms.** Glossary matchers compile once; sentences and amounts are split once per analysis, not once per check; and syllables are counted once per distinct word (a long contract has ~30,000 words but only ~1,400 distinct ones). A test keeps the maximum-size case inside its budget.
- **No wasted model calls.** A request the reader abandons, or that a newer one replaces, is cancelled in the browser, and the server tries no fallback model for it.
- **Every request has a deadline**, so no spinner can run forever.
- **Typing never re-renders the results:** the analysis view is memoised and off-screen clause cards skip layout (`content-visibility: auto`).

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
| `GEMINI_MODEL` | No | Override the model (default `gemini-3.5-flash-lite`) |
| `GEMINI_FALLBACK_MODELS` | No | Comma-separated models to try if the main one is busy (default `gemini-3.1-flash-lite,gemini-3.5-flash,gemini-2.5-flash`) |
| `TRUSTED_PROXY_HOPS` | No | How many proxies in front of the app append to `X-Forwarded-For` (default `1`, right for Vercel and Cloud Run; `2` behind an extra load balancer) |

## Test

```bash
npm run check          # lint + typecheck + all tests
npm test               # 344 tests
npm run test:coverage  # with coverage floors (CI fails below them)
```

| Suite | What it proves |
|---|---|
| `tests/engine` | Segmentation, classification, extraction, both sides' duties, contradictions, retrieval, comparison — and the maximum-size performance budget |
| `tests/ai` | Grounding and fallbacks against a stand-in for the Gemini SDK: invented quotes, clauses that don't exist, malformed JSON, timeouts, cancellation, and prompt-fence break-out attempts — none of it reaches the reader |
| `tests/api` | Every route, plus the guards: spoofed `X-Forwarded-For`, endless streamed bodies, wrong content types, cross-site requests, disguised uploads, security headers |
| `tests/components` | Every page and panel rendered in jsdom and audited with axe; keyboard behaviour, focus management, `lang`/`dir` on AI text, cancellation of superseded requests, and the colour-contrast arithmetic |
| `tests/client` | Request deadlines, cancellation and error handling in the browser |

The AI tests need no key. Coverage is above 90% of statements and lines; GitHub Actions runs lint, types, tests with coverage floors, a production-dependency audit and a production build on every push.

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

JSON routes accept only `application/json` bodies (415 otherwise) and refuse cross-site browser requests (403). The AI routes (`analyze`, `ask`, `explain`, `options`, `compare`) accept an optional `language` code (`en`, `hi`, `mr`, `bn`, `ta`, `te`, `kn`, `gu`, `ml`, `pa`, `ur`, `es`).

## Tech

Next.js (App Router) · TypeScript · Tailwind CSS · Google Gen AI SDK (`@google/genai`) · zod · unpdf · mammoth · Vitest

## Limits, stated plainly

- Not legal advice, and not a verdict of fairness — a clean report can still miss a clause drafted in a novel way.
- AI explanations can be imperfect even when their quotes are verified; the quoted clause is always shown alongside so you can check.
- Jurisdiction-agnostic: it explains what a clause says, not whether it is enforceable where you live.
- Text read from photos and scans can contain errors; review it before analysing.
