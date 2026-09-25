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
- **Safety filters set, not assumed.** Every call states its safety settings — harassment, hate speech, sexual and dangerous content blocked from medium probability up — instead of relying on per-model defaults. A blocked reply falls back to the rule engine like any other failure.
- **Private.** Documents are processed in memory and never stored or logged. No accounts, no analytics on content.

## Security

| Threat | Defence |
|---|---|
| Rate-limit evasion by spoofing `X-Forwarded-For` | The client is the address *our* proxy appended (rightmost hop, `TRUSTED_PROXY_HOPS` for more), never what the client claimed |
| Flooding the limiter from rotating addresses | The limiter's table has a hard ceiling; when it fills, expired clients go first, then a tenth of the table at once, so a flood costs amortised constant time per request instead of a full sweep for each |
| Memory exhaustion via huge or endless bodies | Bodies are read as a stream and abandoned the moment they pass a byte cap — with or without a `Content-Length`; caps are sized in UTF-8 bytes so an Indic-script document gets the same room as English |
| Files built to exhaust the server | A Word file is a ZIP whose size fields can lie, so every XML part the parser will read is actually inflated — off the main thread, against a 48 MB budget — before the parser opens it: a decompression bomb is stopped at the budget instead of unpacked in full. PDFs are read page by page, never past 300 pages |
| Other websites spending this server's Gemini quota through visitors' browsers | JSON-only API (a cross-site form can't send it) and `Sec-Fetch-Site` checks refuse cross-site requests |
| Disguised uploads (a binary renamed `.pdf`/`.jpg`/`.txt`) | File signatures are checked before any parser or model sees the bytes; the image type sent to Gemini comes from the bytes, not the name |
| Prompt injection from the document | Untrusted-data rule in every system prompt, fence-tag defusing, structured JSON output validated by zod, and every quote verified against the document |
| Harmful model output | Safety settings on every Gemini call block harassment, hate speech, sexual and dangerous content from medium probability up; a blocked reply is replaced by the rule engine's |
| Leaking the API key or deployment details | Gemini, HTTP and upload modules are marked `server-only`: a client bundle that imports them fails to build. `/api/health` says only whether Gemini is configured — never the key, the model or the fallback chain |
| Clickjacking, sniffing, cross-origin leaks | A same-origin Content-Security-Policy (`default-src 'self'`, `connect-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`), `X-Frame-Options: DENY`, `nosniff`, COOP/CORP same-origin, HSTS, a locked-down `Permissions-Policy`, no `X-Powered-By` — all pinned by a regression test |
| Error messages echoing document text | Every failure maps to a fixed, generic message in one JSON shape — unknown `/api` paths included; document text is never logged |

## Accessibility

Built to WCAG 2.2 AA, and tested for it:

- **Every page and panel is audited with axe-core** in the test suite, and was audited again in a real browser — including colour contrast — with zero violations.
- **Colour contrast is a test, not a claim:** a test reads the design tokens from `globals.css` and checks every text/background pair for 4.5:1 and the focus ring for 3:1.
- **Explanations are marked with their language.** Gemini's text in Hindi or Tamil carries `lang`, so screen readers switch voice; Urdu carries `dir="rtl"`. Quotes from the document are left in the document's language.
- **Focus goes where the answer is.** A finished analysis or comparison moves focus to its heading; an explanation that replaces its button receives focus; asking a question keeps focus in the question box; the mobile menu closes on Escape and returns focus to its toggle.
- **Short announcements, not floods.** A one-sentence status ("Analysis ready: Rental agreement, 12 clauses; 3 need attention") instead of re-reading a page of results; the character counter is deliberately silent while typing.
- Keyboard-complete tabs (arrow keys, Home/End), visible focus on every control (including the file upload), `prefers-reduced-motion` honoured by CSS and by scrolling, and a print stylesheet that keeps every clause title and risk badge on paper.

## Efficiency

- **Light pages.** Class names are joined by `clsx` alone — no runtime class-merging library — which takes 8 KB of gzipped JavaScript off every page. The six sample contracts are their own script, fetched only when a sample is picked, and the analysis engine never reaches the browser at all: pages get its types, limits and display helpers through one entry point, and a test walks the import graph to keep both that way. The monospace face is preloaded nowhere and fetched only where contract text is shown.
- **Gzipped API responses, with no compression code.** Next.js compresses pages but sends route-handler bodies raw; declaring every `/api` response as JSON in the header config is what lets its gzip reach them. The sample lease's analysis goes out as 5 KB instead of 29 KB.
- **Follow-ups read only what they need.** A question or a described situation is answered from the clauses alone, skipping the document-wide passes (readability, contradiction checks, summary) — about a quarter less work than a full analysis. Explaining one clause reads only that clause: under 20 ms instead of a full analysis's 150+ on a maximum-size contract. Tests check both against the full analysis of every sample.
- **Nothing is fetched twice.** An explanation, answer, set of options, analysis or comparison the reader has already had is shown again from memory, with no request and no model call — reopening a clause after filtering, switching back to a language, picking a sample again. Only complete results are kept, so a Gemini step that fell through is retried. The caches are small, least-recently-used first, keyed by a SHA-256 digest of the document rather than the document itself, and never written to storage.
- **Tabs are built when opened.** The analysis view renders only the tab in front of the reader; the rest are built the first time they are opened and then kept, so a half-typed question survives a look elsewhere.
- **Long PDFs stop early.** A PDF is read one page at a time, and reading stops once there is more text than an analysis takes: the rest of a long file is never parsed.
- **The engine analyses a 200,000-character contract in about 150 ms.** Glossary matchers compile once; sentences and amounts are split once per analysis, not once per check; syllables are counted once per distinct word (a long contract has ~30,000 words but only ~1,400 distinct ones). A test keeps the maximum-size case inside its budget.
- **No wasted model calls.** A request the reader abandons, or that a newer one replaces, is cancelled in the browser, and the server tries no fallback model for it. Every request has a deadline, so no spinner can run forever.
- **Typing never re-renders the results:** the analysis view and every clause card are memoised, and off-screen cards skip layout (`content-visibility: auto`).

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
npm test               # 406 tests
npm run test:coverage  # with coverage floors (CI fails below them)
```

| Suite | What it proves |
|---|---|
| `tests/engine` | Segmentation, classification, extraction, both sides' duties, contradictions, retrieval, comparison; clause-only and single-clause reads checked against the full analysis — and the maximum-size performance budget |
| `tests/ai` | Grounding and fallbacks against a stand-in for the Gemini SDK: invented quotes, clauses that don't exist, malformed JSON, timeouts, cancellation, withheld replies, safety settings on every call, and prompt-fence break-out attempts — none of it reaches the reader |
| `tests/api` | Every route, plus the guards: spoofed `X-Forwarded-For`, a flood of new addresses, endless streamed bodies, wrong content types, cross-site requests, disguised uploads, decompression bombs that lie about their size, page-heavy PDFs, JSON 404s and the security headers |
| `tests/components` | Every page and panel rendered in jsdom and audited with axe; keyboard behaviour, focus management, tabs built on first open, `lang`/`dir` on AI text, cancellation of superseded requests, and the colour-contrast arithmetic |
| `tests/client` | Request deadlines, cancellation and error handling in the browser; answers kept per document and never refetched; digest cache keys; the import graph that keeps the engine and the sample texts out of the browser |

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

JSON routes accept only `application/json` bodies (415 otherwise) and refuse cross-site browser requests (403). Every response, errors included, is JSON in one shape — `{ "error": { "code", "message" } }` for failures — and an unknown `/api` path gets a JSON 404. The AI routes (`analyze`, `ask`, `explain`, `options`, `compare`) accept an optional `language` code (`en`, `hi`, `mr`, `bn`, `ta`, `te`, `kn`, `gu`, `ml`, `pa`, `ur`, `es`).

## Tech

Next.js (App Router) · TypeScript · Tailwind CSS · Google Gen AI SDK (`@google/genai`) · zod · unpdf · mammoth · Vitest

## Limits, stated plainly

- Not legal advice, and not a verdict of fairness — a clean report can still miss a clause drafted in a novel way.
- AI explanations can be imperfect even when their quotes are verified; the quoted clause is always shown alongside so you can check.
- Jurisdiction-agnostic: it explains what a clause says, not whether it is enforceable where you live.
- Text read from photos and scans can contain errors; review it before analysing.
