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
          This preview uses browser storage. The demo and self-hosted editions described below
          arrive in a later milestone.
        </p>
        <ol className="architecture-steps">
          <li>Your browser picks up the session from the server: questions and a signed token.</li>
          <li>The browser reads the question with its built-in speech synthesis.</li>
          <li>The browser’s speech recognition turns your answer into text.</li>
          <li>You edit the text; delivery numbers are counted in the browser.</li>
          <li>
            The server checks the token and limits, sends the question and your answer to OpenAI
            with a fixed rubric, and validates the JSON it gets back.
          </li>
          <li>
            The browser stores the result in IndexedDB. No session or answer is stored on the server
            in this preview.
          </li>
        </ol>
        <p>
          The planned public demo uses pre-written feedback and browser storage. The full
          self-hosted edition will score answers live and save sessions in SQLite on your machine.
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
          The answer is passed to the model as data, marked untrusted. The model is told to ignore
          instructions inside it and to use only facts you gave. Quotes in ‘What worked’ are checked
          against your answer and removed if they don’t match. Rewrites use placeholders like
          [metric] instead of making numbers up.
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
          Rehearse never receives your audio. Browser speech services may process it. Live feedback
          sends your edited answer to OpenAI; the planned demo will use pre-written feedback without
          a provider call.
        </p>
        <Link href="/privacy">Read where your words go</Link>
      </section>
      <section>
        <h2>Browser support</h2>
        <p>
          Support is feature-detected, not inferred from the browser name. Physical speech checks
          remain unverified on this release preview.
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
          Speech recognition quality depends on your browser, microphone and accent. Scores come
          from a language model and can vary slightly between runs. The question bank is in English
          and covers five roles. Rehearse doesn’t judge tone of voice, accent or appearance. Speech
          services often leave out sounds like ‘um’, so filler counts in voice answers are a lower
          bound. Pauses are estimated from when the browser reports words, to within about half a
          second, and are less accurate in browsers that report words less often.
        </p>
      </section>
      <section>
        <h2>Cost</h2>
        <p>
          Live feedback uses the configured model and its token prices. The preview enforces request
          and spending limits. The planned demo will make no model calls; the self-hosted edition
          will use your key and budget.
        </p>
        <a href="https://github.com/firatkill/rehearse#readme">
          See the setup and limits in the README
        </a>
      </section>
    </article>
  );
}
