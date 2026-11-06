import { serverTranslator, requestLanguage } from '@/lib/i18n/server';
import { T } from '@/lib/i18n/context';
import { getEnv } from '@/lib/env';
import { LanguageLink as Link } from '@/lib/i18n/link';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import thresholds from '@/eval/thresholds.json';
import { EvalResultsSchema } from '@/lib/eval/results-schema';
import { DIMENSIONS, QUESTION_TYPES } from '@/lib/config';
import { translatedLabels } from '@/lib/i18n/labels';
import { RUBRIC, RUBRIC_SENIORITY_NOTE } from '@/lib/feedback/rubric';
import { RUBRIC_TR, RUBRIC_SENIORITY_NOTE_TR } from '@/lib/feedback/rubric-tr';
import { Eyebrow } from '@/components/ui/eyebrow';

export async function generateMetadata() {
  const t = await serverTranslator();
  return { title: t('title.how') };
}
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function HowItWorksPage() {
  const t = await serverTranslator();
  const language = await requestLanguage();
  const rubric = language === 'tr' ? RUBRIC_TR : RUBRIC;
  const seniorityNote = language === 'tr' ? RUBRIC_SENIORITY_NOTE_TR : RUBRIC_SENIORITY_NOTE;
  const { DIMENSION_LABELS, QUESTION_TYPE_LABELS } = translatedLabels(t);

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
        <Eyebrow>
          <T id="app.how.it.works.page.1" />
        </Eyebrow>
        <h1>
          <T id="components.layout.header.5" />
        </h1>
        <p className="info-lead">
          <T id="app.how.it.works.page.3" />
        </p>
      </header>
      <section>
        <h2>
          <T id="app.how.it.works.page.4" />
        </h2>
        <p className="banner">{demo ? t('public.dynamic.29') : t('public.dynamic.30')}</p>
        <ol className="architecture-steps">
          <li>
            <T id="app.how.it.works.page.5" />
          </li>
          <li>
            <T id="app.how.it.works.page.6" />
          </li>
          <li>
            <T id="app.how.it.works.page.7" />
          </li>
          <li>
            <T id="app.how.it.works.page.8" />
          </li>
          <li>{demo ? t('public.dynamic.31') : t('public.dynamic.32')}</li>
          <li>{demo ? t('public.dynamic.33') : t('public.dynamic.34')}</li>
        </ol>
        <p>
          <T id="app.how.it.works.page.9" />
        </p>
      </section>
      <section>
        <h2>
          <T id="app.how.it.works.page.10" />
        </h2>
        <p>
          <T id="app.how.it.works.page.11" />
        </p>
        {QUESTION_TYPES.map((type) => (
          <details className="rubric-type" key={type}>
            <summary>{QUESTION_TYPE_LABELS[type]}</summary>
            {DIMENSIONS.map((dimension) => (
              <section key={dimension}>
                <h3>{DIMENSION_LABELS[dimension]}</h3>
                <p>{rubric[dimension].question}</p>
                <ol>
                  {rubric[dimension].anchors[type].map((anchor) => (
                    <li key={anchor}>{anchor}</li>
                  ))}
                </ol>
              </section>
            ))}
          </details>
        ))}
        <p>{seniorityNote}</p>
      </section>
      <section>
        <h2>
          <T id="app.how.it.works.page.12" />
        </h2>
        <p>{demo ? t('public.dynamic.35') : t('public.dynamic.36')}</p>
      </section>
      <section>
        <h2>
          <T id="app.how.it.works.page.13" />
        </h2>
        <p>
          <T id="app.how.it.works.page.14" />
        </p>
        <div className="info-table">
          <table>
            <caption>
              <T id="app.how.it.works.page.15" />
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  <T id="app.how.it.works.page.16" />
                </th>
                <th scope="col">
                  <T id="app.how.it.works.page.17" />
                </th>
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
            <h3>
              <T id="app.how.it.works.page.18" />
            </h3>
            <p>
              <time dateTime={result.finishedAt}>{result.finishedAt.slice(0, 10)}</time> ·{' '}
              {result.model} · {result.promptVersion} ·{' '}
              {result.passed ? t('public.dynamic.37') : t('public.dynamic.38')}
            </p>
            <div className="info-table">
              <table>
                <caption>
                  <T id="app.how.it.works.page.19" />
                </caption>
                <thead>
                  <tr>
                    <th scope="col">
                      <T id="app.how.it.works.page.20" />
                    </th>
                    <th scope="col">
                      <T id="app.how.it.works.page.21" />
                    </th>
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
              <T id="app.how.it.works.page.22" />
            </a>
          </>
        ) : (
          <p>
            <T id="app.how.it.works.page.23" />
          </p>
        )}
      </section>
      <section id="privacy">
        <h2>
          <T id="app.how.it.works.page.24" />
        </h2>
        <p>{demo ? t('public.dynamic.39') : t('public.dynamic.40')}</p>
        <Link href="/privacy">
          <T id="app.how.it.works.page.25" />
        </Link>
      </section>
      <section>
        <h2>
          <T id="app.how.it.works.page.26" />
        </h2>
        <p>
          <T id="app.how.it.works.page.27" />
        </p>
        <div className="info-table">
          <table>
            <caption>
              <T id="app.how.it.works.page.28" />
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  <T id="app.how.it.works.page.29" />
                </th>
                <th scope="col">
                  <T id="app.how.it.works.page.30" />
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">
                  <T id="app.how.it.works.page.31" />
                </th>
                <td>
                  <T id="app.how.it.works.page.32" />
                </td>
              </tr>
              <tr>
                <th scope="row">
                  <T id="app.how.it.works.page.33" />
                </th>
                <td>
                  <T id="app.how.it.works.page.34" />
                </td>
              </tr>
              <tr>
                <th scope="row">
                  <T id="app.how.it.works.page.35" />
                </th>
                <td>
                  <T id="app.how.it.works.page.36" />
                </td>
              </tr>
              <tr>
                <th scope="row">
                  <T id="app.how.it.works.page.37" />
                </th>
                <td>
                  <T id="app.how.it.works.page.38" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          <T id="app.how.it.works.page.39" />
        </p>
      </section>
      <section>
        <h2>
          <T id="app.how.it.works.page.40" />
        </h2>
        <p>
          <T id="app.how.it.works.page.41" />{' '}
          {demo ? t('public.dynamic.41') : t('public.dynamic.42')}{' '}
          {t(demo ? 'app.how.it.works.page.42' : 'public.bank.full')}
        </p>
      </section>
      <section>
        <h2>
          <T id="app.how.it.works.page.43" />
        </h2>
        <p>{demo ? t('public.dynamic.43') : t('public.dynamic.44')}</p>
        <a href="https://github.com/firatkill/rehearse#readme">
          <T id="app.how.it.works.page.44" />
        </a>
      </section>
    </article>
  );
}
