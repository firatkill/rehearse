import { getEnv } from '@/lib/env';
import Link from 'next/link';
import { Eyebrow } from '@/components/ui/eyebrow';
export const metadata = { title: 'Privacy · Rehearse' };
export default function PrivacyPage() {
  const demo = getEnv().APP_EDITION === 'demo';
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
        <h2>{demo ? 'What stays in your browser' : 'What stays on your machine'}</h2>
        <p>
          {demo
            ? 'The demo saves sessions, transcripts and sample feedback in this browser’s IndexedDB on this device. When you request sample feedback, your answer is sent to the demo server to select an example; it is not saved there or sent to an AI provider.'
            : 'The full edition stores sessions, answers, feedback and job posts in SQLite on the machine running your self-hosted server. These records can be reopened across browsers. Live feedback sends answer text to OpenAI as described below.'}{' '}
          Settings are stored locally in your browser. You can export or delete sessions on the{' '}
          <Link href="/progress">Progress page</Link>.
        </p>
      </section>
      <section>
        <h2>The two editions</h2>
        <p>
          {demo ? 'You are using the public demo.' : 'You are using the full, self-hosted edition.'}
        </p>
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
              Sessions, answers, feedback and job posts are saved in SQLite on your machine. Live
              scoring uses your OpenAI key. The self-hosted server receives and stores these records
              so you can reopen them across browsers.
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
          {demo
            ? 'Demo feedback is pre-written sample content. The demo server receives your answer to select an example, but does not store or log your answer or feedback text. Your answer is not sent to a model or assessed by AI.'
            : 'When you ask for live feedback, your self-hosted server sends the question, the rubric and your edited answer to OpenAI to produce the scores. Sessions, answers and feedback are saved in local SQLite. Application logs exclude answer and feedback text; they contain technical details such as lengths, timings, token counts and estimated cost.'}
        </p>
        <p>
          In the full edition, OpenAI’s API data is not used for model training by default.
          Abuse-monitoring logs may retain content for up to 30 days by default, with exceptions for
          legal and safety needs. Retention also depends on the endpoint and account controls.
        </p>
        <a href="https://developers.openai.com/api/docs/guides/your-data">
          OpenAI’s API data policy
        </a>
        <p>
          {demo
            ? 'The demo session summary is pre-written. Answer counts and delivery metrics are calculated from your session without an AI call.'
            : 'For the session summary, only the scores and the short improvement points are sent to OpenAI, not your answers. Job-post generation sends the post text to OpenAI; fetching a job link contacts that website from your self-hosted server.'}
        </p>
      </section>
      <section>
        <h2>Limits and your IP address</h2>
        <p>
          {demo
            ? 'The demo makes no AI calls, has no daily provider quotas and needs no Upstash service. Rehearse does not store raw IP addresses.'
            : 'The full edition has no daily IP quotas and uses an in-memory request limiter by default. Monthly budget warnings do not block practice. Rehearse does not store raw IP addresses or log answer text.'}
        </p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p>
          Use text mode to avoid browser speech services.{' '}
          {demo
            ? 'Use ‘Save without feedback’ to keep a demo answer in this browser without sending it to the demo server.'
            : 'Use ‘Save without feedback’ to save an answer in local SQLite without sending it to OpenAI.'}{' '}
          Export or delete sessions from the <Link href="/progress">Progress page</Link>.
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
      <p className="info-updated">Last updated 6 November 2026.</p>
    </article>
  );
}
