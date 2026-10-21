# M2 browser evidence — 2026-10-21

This is A-11’s first documentation pass, not physical-browser certification.

| Browser family         | Recognition evidence                                                            | Synthesis evidence     | Verification limit                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Chrome / Chromium Edge | MDN BCD lists unprefixed Chrome 139 and prefixed Chrome 33; Edge mirrors Chrome | Chrome 33, Edge 14     | Mocked Chromium E2E plus live Chrome 155.0.8059.85 text flow; no physical spoken pass                            |
| Firefox                | Recognition is listed as `preview`, not a stable-release version                | Firefox 49; Android 62 | Stable-release text fallback remains appropriate; preview builds may expose recognition and are feature-detected |
| Safari / iOS Safari    | Prefixed recognition from Safari 14.1; iOS mirrors                              | Safari 7; iOS mirrors  | Siri/Dictation, gesture and microphone assumptions remain manual-required                                        |
| Brave / other variants | Not independently certified by these MDN family entries                         | Feature-detected       | Service availability cannot be inferred from constructor presence                                                |

Sources: [MDN recognition compatibility data](https://github.com/mdn/browser-compat-data/blob/main/api/SpeechRecognition.json), [MDN synthesis compatibility data](https://github.com/mdn/browser-compat-data/blob/main/api/SpeechSynthesis.json). These are mutable upstream files; the observations above are dated.

A-13: on-device recognition is future work (D-59); it is not enabled by this app.
A-21: [SpeechRecognitionResult](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognitionResult) exposes alternatives, length and finality rather than word timestamps. The app uses the specified event-time approximation (D-61). Physical accuracy is not certified here.

Live Chrome observation: English voices were listed, keyboard rate adjustment changed 1.0× to 0.9×, and three edited text answers reached the report. Preview returned immediately, so neither audible output nor its timing was verified. The text flow continued through the read-aloud path; no physical microphone was used. Browser console capture reported no errors during this pass.
