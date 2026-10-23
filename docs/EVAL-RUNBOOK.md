# Owner eval checks

T-37 requires a genuine passing live evaluation. T-38 requires the paid workflow to pass on a relevant same-repository pull request. Mock smoke tests do not satisfy either acceptance criterion.

## Local live evaluation (T-37)

1. Use the separate OpenAI project `rehearse-eval`, with its decided $2 monthly budget and auto-recharge off. Keep its API key in `.env.local`; never paste it into chat or commit it.
2. In `.env.local`, set `LLM_MODE=live`, `RATE_LIMIT_BACKEND=memory`, `OPENAI_API_KEY`, the pinned `CHAT_MODEL`, its temperature/reasoning settings, and all three `PRICE_*` values from `.env.example` after verifying the prices. Retain the local session/IP secrets and site URL. `EVAL_MAX_COST_USD=0.50` is the per-run guard; `EVAL_REPEATS=2` is the full-run default.
3. Run `pnpm eval:validate`, then `pnpm eval`. The live call is owner-only. Do not use `--mock`, `--only` or `--no-gate` for this acceptance run.
4. Inspect the dated JSON written under `eval/results/`. It must have the real model ID, 48 items, no failures and `passed: true`. Review the fictional answers and feedback. A failing run remains evidence, not a release pass; do not lower thresholds to make it pass.
5. Tell the coding agent the result file path. After validation, the passing full run can be copied to `eval/results/latest.json` and committed. Do not replace `latest.json` with mock or subset results.

The runner refuses a live run with zero prices or an estimate above budget before provider calls. If reported usage exceeds the budget, it stops scheduling more calls and writes a failed partial result. Already-running calls may finish. Exit codes: 0 for passing gates (or explicit `--no-gate`), 1 for quality-gate failures, 2 for configuration/budget errors.

## GitHub configuration (T-38, owner only)

Create environment `eval` in repository Settings → Environments. Add:

- Environment secret `OPENAI_API_KEY`: the separate eval project's key.
- Environment variables `CHAT_MODEL`, `CHAT_MODEL_SUPPORTS_TEMPERATURE`, `CHAT_REASONING_EFFORT` (may be empty), `PRICE_INPUT_PER_MTOK`, `PRICE_OUTPUT_PER_MTOK`, `PRICE_CACHED_INPUT_PER_MTOK`.

Keep credentials out of repository files and chat. Once the workflow is committed and this configuration is ready, the coding agent can open a relevant same-repository PR to verify the budgeted job. A README-only PR must not trigger paid eval, and fork pull requests must skip it. CI results stay as artifacts; they do not update `latest.json` automatically.
