# M2 live browser checks

Direct surfaces: setup voice selector/preview; question playback/captions; recorder and speech errors; text fallback.
Blast radius: setup preferences, room timers, dialog focus, saved answers/report navigation. No account roles; readonly mode deliberately avoids provider calls (D-58).
Must remain: full question visible, text answers editable and preserved, no microphone left active, model/visitor text rendered safely.

| Route                   | Mode                           | Action                                                       | Expected                                                                                     |
| ----------------------- | ------------------------------ | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| /setup                  | readonly, desktop Chrome       | Inspect English voices, adjust rate and preview/stop         | Voice controls usable; preview stops; no microphone requested                                |
| /session/[id]           | Text with read-aloud           | Start; inspect asking/captions; stop reading and open answer | Full question visible, captions highlight, editable text answer                              |
| /session/[id]           | Text                           | Enter/edit/save an answer and finish remaining questions     | Edited answers retained through placeholder report                                           |
| /session/[id]           | Voice                          | Physical three-question Chrome session                       | Requires human microphone input; not replaceable with speech mocks                           |
| Physical browser matrix | Chrome/Edge/Safari/Android/iOS | A-14, A-15, A-20, A-25                                       | Requires real hardware/browser settings and human speech; report unverified when unavailable |

Automated voice scenarios use the separate Playwright mock servers. Live browser observations are logged in qa/test-results.json. A readable UI or a mock pass does not verify microphone recognition or audible output.
