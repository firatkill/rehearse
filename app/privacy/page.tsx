import Link from 'next/link';
import { Eyebrow } from '@/components/ui/eyebrow';
export const metadata = { title: 'Privacy · Rehearse' };
export default function PrivacyPage() {
  return (
    <article className="info-page">
      <header>
        <Eyebrow>Your words, your choice</Eyebrow>
        <h1>Privacy</h1>
        <p className="info-lead">
          Rehearse has no accounts, no cookies and no analytics. This page explains exactly where
          your words go.
        </p>
      </header>
      <section>
        <h2>What stays in your browser</h2>
        <p>
          This preview stores your sessions, transcripts, feedback and reports in this browser’s
          IndexedDB on this device. Settings are stored locally. Saved sessions are not uploaded as
          a history; asking for live feedback sends the individual answer as described below. You
          can export or delete sessions on the <Link href="/progress">Progress page</Link>.
        </p>
      </section>
      <section>
        <h2>The two editions</h2>
        <p>The editions below are planned, not active in this preview.</p>
        <dl className="edition-privacy">
          <div>
            <dt>Demo, on the public site</dt>
            <dd>
              Sessions stay in this browser’s IndexedDB. Feedback is pre-written sample content; no
              answer is sent to a model provider.
            </dd>
          </div>
          <div>
            <dt>Full, self-hosted</dt>
            <dd>
              Sessions, transcripts, feedback, job posts and story notes are saved in SQLite on your
              machine. Live scoring uses your OpenAI key. The self-hosted server receives and stores
              these records so you can reopen them across browsers.
            </dd>
          </div>
        </dl>
      </section>
      <section>
        <h2>Speech recognition</h2>
        <p>
          Voice answers are transcribed by your browser’s built-in speech recognition, not by
          Rehearse. In Google Chrome, recognition sends your audio to Google’s servers. In Safari,
          audio is sent to Apple’s servers unless your device transcribes on-device. Other browsers
          may send audio to their own speech services. These companies’ own privacy policies apply.
          Rehearse never receives your audio. If you don’t want your voice processed by these
          services, use text mode.
        </p>
        <a href="https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition">
          Read about browser speech recognition
        </a>
      </section>
      <section>
        <h2>Reading questions aloud</h2>
        <p>
          Questions are read with your system’s voices. Voices marked ‘online voice’ send the
          question text, not your answers, to the browser vendor to produce speech.
        </p>
      </section>
      <section>
        <h2>Feedback</h2>
        <p>
          When you ask for live feedback, the text of that one answer and the question id are sent
          to the Rehearse server, which sends the question, the rubric and your answer to OpenAI to
          produce the scores. This preview does not store or log your answer or the feedback on the
          server. It logs only technical details: the time, the length of the answer in characters,
          how long the request took, token counts and estimated cost.
        </p>
        <p>
          OpenAI’s API data is not used for model training by default. Abuse-monitoring logs may
          retain content for up to 30 days by default, with exceptions for legal and safety needs.
          Retention also depends on the endpoint and account controls.
        </p>
        <a href="https://developers.openai.com/api/docs/guides/your-data">
          OpenAI’s API data policy
        </a>
        <p>
          For the session summary, only the scores and the short improvement points are sent, not
          your answers.
        </p>
      </section>
      <section>
        <h2>Limits and your IP address</h2>
        <p>
          The preview counts sessions and feedback requests per visitor per day. In a hosted
          deployment, it identifies you by a one-way hash of your IP address with a secret that
          changes every day, stored in Upstash Redis for at most 2 days. The raw IP address is never
          stored. Local development can use an in-memory limiter. The planned demo needs no provider
          quota; full self-hosting will enforce your configured budget.
        </p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p>
          Use text mode to avoid browser speech services. Use ‘Save without feedback’ to keep an
          answer entirely in your browser in this preview. Delete everything at any time from the{' '}
          <Link href="/progress">Progress page</Link>.
        </p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>
          Questions about privacy:{' '}
          <a href="https://github.com/firatkill/rehearse/issues">open an issue on GitHub</a> or
          email the address on <a href="https://firatkil.com">firatkil.com</a>.
        </p>
      </section>
      <p className="info-updated">Last updated 5 November 2026.</p>
    </article>
  );
}
