import { getEnv } from '@/lib/env';
import Link from 'next/link';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import thresholds from '@/eval/thresholds.json';
import { EvalResultsSchema } from '@/lib/eval/results-schema';
import { DIMENSIONS, QUESTION_TYPES } from '@/lib/config';
import { DIMENSION_LABELS, QUESTION_TYPE_LABELS } from '@/lib/labels';
import { RUBRIC, RUBRIC_SENIORITY_NOTE } from '@/lib/feedback/rubric';
import { Eyebrow } from '@/components/ui/eyebrow';

export const metadata = { title: 'How it works · Rehearse' };
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function HowItWorksPage() {
  const demo = getEnv().APP_EDITION === 'demo';
  const directory = path.join(process.cwd(), 'eval/results');
  const files = (await readdir(directory)).filter((file) =>
    /^\d{4}-\d{2}-\d{2}(?:-\d+)?\.json$/.test(file),
  );
  const latest = files.sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).at(-1);
  const result = latest
    ? EvalResultsSchema.parse(JSON.parse(await readFile(path.join(directory, latest), 'utf8')))
    : null;
  const gates = Object.entries(thresholds).flatMap(([group, value]) =>
    typeof value === 'number'
      ? [[group, value] as const]
      : Object.entries(value).map(([name, threshold]) => [`${group}.${name}`, threshold] as const),
  );
  return (
    <article className="info-page">
      <header>
        <Eyebrow>Behind the feedback</Eyebrow>
        <h1>How it works</h1>
        <p className="info-lead">
          A fixed rubric, your own words, and one useful thing to practise next.
        </p>
      </header>
      <section>
        <h2>Architecture</h2>
        <p className="banner">
          {demo
            ? 'You are using the demo: feedback is pre-written, sessions stay in your browser and no AI is called.'
            : 'You are using the full edition: live feedback uses your OpenAI key, and sessions are saved in local SQLite.'}
        </p>
        <ol className="architecture-steps">
          <li>Your browser picks up the session from the server: questions and a signed token.</li>
          <li>The browser reads the question with its built-in speech synthesis.</li>
          <li>The browser’s speech recognition turns your answer into text.</li>
          <li>You edit the text; delivery numbers are counted in the browser.</li>
          <li>
            {demo
              ? 'The server receives your answer to select pre-written sample feedback, then returns it without storing your answer or calling an AI provider.'
              : 'The server checks the token and request limits, sends the question and your answer to OpenAI with a fixed rubric, and validates the JSON it gets back.'}
          </li>
          <li>
            {demo
              ? 'The browser stores sessions, answers and sample feedback in IndexedDB. The demo does not store them on the server.'
              : 'The self-hosted server stores sessions, answers, feedback and job posts in SQLite on your machine so you can reopen them across browsers.'}
          </li>
        </ol>
        <p>
          The public demo uses pre-written feedback and browser storage. The full self-hosted
          edition scores answers live and saves sessions in SQLite on your machine.
        </p>
      </section>
      <section>
        <h2>The rubric</h2>
        <p>
          Each dimension is scored from 1 to 4. These are the same anchors used in the scoring
          prompt.
        </p>
        {QUESTION_TYPES.map((type) => (
          <details className="rubric-type" key={type}>
            <summary>{QUESTION_TYPE_LABELS[type]}</summary>
            {DIMENSIONS.map((dimension) => (
              <section key={dimension}>
                <h3>{DIMENSION_LABELS[dimension]}</h3>
                <p>{RUBRIC[dimension].question}</p>
                <ol>
                  {RUBRIC[dimension].anchors[type].map((anchor) => (
                    <li key={anchor}>{anchor}</li>
                  ))}
                </ol>
              </section>
            ))}
          </details>
        ))}
        <p>{RUBRIC_SENIORITY_NOTE}</p>
      </section>
      <section>
        <h2>How feedback is kept honest</h2>
        <p>
          {demo
            ? 'Demo feedback is pre-written for fictional example answers; it is not an assessment of your answer. The full edition validates live feedback against your words.'
            : 'The answer is passed to the model as data, marked untrusted. The model is told to ignore instructions inside it and to use only facts you gave. Quotes in ‘What worked’ are checked against your answer and removed if they don’t match. Rewrites use placeholders like [metric] instead of making numbers up.'}
        </p>
      </section>
      <section>
        <h2>How it’s measured</h2>
        <p>
          The evaluation scores fictional golden answers, checks expected ranges and ordering,
          validates output, and tests instruction injection. It measures feedback quality, not
          hiring outcomes.
        </p>
        <div className="info-table">
          <table>
            <caption>Evaluation acceptance thresholds</caption>
            <thead>
              <tr>
                <th scope="col">Check</th>
                <th scope="col">Threshold</th>
              </tr>
            </thead>
            <tbody>
              {gates.map(([name, threshold]) => (
                <tr key={name}>
                  <th scope="row">{name}</th>
                  <td>
                    {name.includes('p95')
                      ? `≤ ${threshold} ms`
                      : `≥ ${Math.round(threshold * 100)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {result ? (
          <>
            <h3>Latest committed evaluation</h3>
            <p>
              <time dateTime={result.finishedAt}>{result.finishedAt.slice(0, 10)}</time> ·{' '}
              {result.model} · {result.promptVersion} ·{' '}
              {result.passed ? 'All gates passed' : 'Some gates failed'}
            </p>
            <div className="info-table">
              <table>
                <caption>Recorded results, not a new model call</caption>
                <thead>
                  <tr>
                    <th scope="col">Metric</th>
                    <th scope="col">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(result.metrics).map(([name, value]) => (
                    <tr key={name}>
                      <th scope="row">{name}</th>
                      <td>{Number(value.toFixed(6))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <a href={`https://github.com/firatkill/rehearse/blob/main/eval/results/${latest}`}>
              Read the evaluation result
            </a>
          </>
        ) : (
          <p>No evaluation result has been committed yet.</p>
        )}
      </section>
      <section id="privacy">
        <h2>Privacy model</h2>
        <p>
          {demo
            ? 'Rehearse never receives your audio. Browser speech services may process it. Demo history is saved in your browser. The server receives answer text to select pre-written feedback without saving it or calling an AI provider.'
            : 'Rehearse never receives your audio. Browser speech services may process it. Live feedback sends your edited answer to OpenAI; sessions, answers and job posts are stored in local SQLite on your machine.'}
        </p>
        <Link href="/privacy">Read where your words go</Link>
      </section>
      <section>
        <h2>Browser support</h2>
        <p>
          Support is feature-detected, not inferred from the browser name. The owner confirmed
          microphone and voice preview in Chrome and Safari, and VoiceOver in Safari, on the
          deployed site on 6 November 2026. This is not an exhaustive device check; voice-preview
          latency has not been formally measured.
        </p>
        <div className="info-table">
          <table>
            <caption>Speech support and fallback</caption>
            <thead>
              <tr>
                <th scope="col">Browser</th>
                <th scope="col">What to expect</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Chrome</th>
                <td>
                  Speech recognition may be available with microphone permission and a network
                  connection.
                </td>
              </tr>
              <tr>
                <th scope="row">Safari</th>
                <td>
                  Speech availability depends on the device and settings; start with a microphone
                  check.
                </td>
              </tr>
              <tr>
                <th scope="row">Edge and other browsers</th>
                <td>Use voice only when the browser exposes recognition; otherwise type.</td>
              </tr>
              <tr>
                <th scope="row">Firefox</th>
                <td>Use text mode when speech recognition is unavailable.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Installed voices vary by system. Typing is always available; reading questions aloud is
          optional.
        </p>
      </section>
      <section>
        <h2>Limits</h2>
        <p>
          Speech recognition quality depends on your browser, microphone and accent.{' '}
          {demo
            ? 'Demo scores are pre-written examples, not a judgement of your answer.'
            : 'Scores come from a language model and can vary slightly between runs.'}{' '}
          The question bank is in English and covers five roles. Rehearse doesn’t judge tone of
          voice, accent or appearance. Speech services often leave out sounds like ‘um’, so filler
          counts in voice answers are a lower bound. Pauses are estimated from when the browser
          reports words, to within about half a second, and are less accurate in browsers that
          report words less often.
        </p>
      </section>
      <section>
        <h2>Cost</h2>
        <p>
          {demo
            ? 'The demo makes no model calls and needs no provider key. Running the full edition uses your own OpenAI key and incurs provider charges.'
            : 'Live feedback and job-post generation use your OpenAI key and the configured model prices. Monthly budget warnings do not block practice; there are no daily IP quotas. Provider billing remains authoritative.'}
        </p>
        <a href="https://github.com/firatkill/rehearse#readme">
          See the setup and limits in the README
        </a>
      </section>
    </article>
  );
}
