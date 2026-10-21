# Rehearse

Rehearse is a voice mock-interview coach: answer questions out loud in the browser and get structured, rubric-based feedback on every answer. Built with Next.js, browser speech APIs and a fixed six-dimension rubric. Sessions stay in your browser. Implementation is tracked in [docs/PROGRESS.md](docs/PROGRESS.md).

Versions pinned on 2026-10-21. MIT, copyright Fırat Kıl.

When another project uses the default E2E ports, choose four free consecutive ports, for example `E2E_BASE_PORT=3240 pnpm test:e2e`. Check those ports before starting a run. CI keeps the default 3200–3203 range.

## Future work

On-device speech recognition is available through newer browser APIs but is not used in v1 (TRD A-13). Chrome 139 introduced this capability; MDN documents `processLocally`, language availability checks and language-pack installation. Rehearse continues to use the browser’s default recognition service. Sources checked 2026-10-21: [Chrome 139 release notes](https://developer.chrome.com/release-notes/139), [MDN processLocally](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/processLocally).
