# Owner eval checks

D-93: a passing local live `pnpm eval` run with its committed result file satisfies the evaluation requirement. Paid GitHub CI is optional and skips cleanly without configuration. **Do not configure the GitHub `eval` environment or secrets.** Mock smoke tests do not establish model quality.

## Local live evaluation

1. Use the separate OpenAI project `rehearse-eval`, with its decided monthly budget and auto-recharge off. Keep the key in `.env.local`; never paste it into chat or commit it.
2. Set `LLM_MODE=live`, `RATE_LIMIT_BACKEND=memory`, `OPENAI_API_KEY`, the approved `CHAT_MODEL`, its temperature/reasoning settings, and verified `PRICE_*` values. Preserve the local session/IP secrets and site URL. The full run uses `EVAL_REPEATS=2`.
3. Obtain explicit owner approval and a spend ceiling before making live calls. Run `pnpm eval:validate`, then `pnpm eval --budget <approved-remaining-ceiling>`. Do not use `--mock`, `--only` or `--no-gate` for full acceptance.
4. Inspect the dated JSON under `eval/results/`. It must cover every current golden item for both repeats, use the real model, have no failures and have `passed: true`. Review the fictional answers and feedback. Keep failed runs as evidence; never lower thresholds to make a run pass.
5. Commit the dated result file with the task. `/how-it-works` selects the newest dated result; no duplicate `latest.json` is needed. Record the command, actual cost, prompt version and any limitations in the progress file.

The runner refuses a live run with zero prices or an estimate above budget before provider calls. If reported usage exceeds the budget, it stops scheduling more calls and writes a failed partial result. Already-running calls may finish. Exit codes: 0 for passing gates (or explicit `--no-gate`), 1 for quality-gate failures, 2 for configuration/budget errors.

## GitHub workflow

The optional workflow checks configuration before installing dependencies or making calls. Missing model, price or key configuration produces a successful skip and a job summary. When configured in a future owner-approved change, genuine eval failures still fail that job. Fork PRs skip paid execution. D-93 replaces the former mandatory paid-CI acceptance; local committed evidence is authoritative.

## Current committed acceptance (2026-11-05)

`eval/results/2026-11-05-6.json` passes every gate with `gpt-6-luna`, `feedback-v3`, 27 golden items and two repeats (54 calls). Clarity is 0.944444, injection resistance 1.0 and p95 latency 8405 ms. V1 cumulative recorded spend is $0.08355056 of the approved $0.15 ceiling. Earlier failed runs remain committed. No further paid run is scheduled. The harness evaluates feedback, not session summaries.
