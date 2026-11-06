import { serverTranslator } from '@/lib/i18n/server';
import { T } from '@/lib/i18n/context';
import { getEnv } from '@/lib/env';
import type { Metadata } from 'next';
import { LanguageLink as Link } from '@/lib/i18n/link';
import sample from '@/content/sample/session.json';
import { SampleFileSchema } from '@/lib/storage/sample-schema';
import { DIMENSIONS, SESSION, type Dimension } from '@/lib/config';
import { Eyebrow } from '@/components/ui/eyebrow';
import { ScoreStrip } from '@/components/ui/score-strip';
import { MarkedTranscript } from '@/components/ui/marked-transcript';
import { SafeText } from '@/components/common/safe-text';

export const metadata: Metadata = {
  title: 'Rehearse: practise interviews out loud',
  description:
    'Practise interviews out loud or by typing. Get clear feedback on six dimensions and see what to say better.',
};

export default async function Home() {
  const t = await serverTranslator();

  const dimensions = [
    [t('public.dynamic.1'), t('public.dynamic.2')],
    [t('public.dynamic.3'), t('public.dynamic.4')],
    [t('public.dynamic.5'), t('public.dynamic.6')],
    [t('public.dynamic.7'), t('public.dynamic.8')],
    [t('public.dynamic.9'), t('public.dynamic.10')],
    [t('public.dynamic.11'), t('public.dynamic.12')],
  ];
  const demo = getEnv().APP_EDITION === 'demo';
  const data = SampleFileSchema.parse(sample);
  const answer = data.answers.find((a) => a.feedback !== null);
  const question = data.session.questions.find((q) => q.id === answer?.questionId);
  const feedback = answer?.feedback;
  const excerpt =
    answer?.transcript
      .split(/(?<=\.)\s/)
      .slice(0, 2)
      .join(' ') ?? '';
  const marks =
    feedback?.strengths.flatMap((s) => {
      const start = excerpt.indexOf(s.evidence ?? '');
      return s.evidence && start >= 0
        ? [{ start, end: start + s.evidence.length, kind: 'strong' as const }]
        : [];
    }) ?? [];
  const scores = Object.fromEntries(
    DIMENSIONS.map((d) => [d, feedback?.scores[d].score ?? null]),
  ) as Record<Dimension, number | null>;
  return (
    <div className="landing">
      <section className="landing-hero container">
        <div className="landing-intro">
          <Eyebrow>
            <T id="app.page.1" />
          </Eyebrow>
          <h1>
            <T id="app.page.2" />
          </h1>
          <p className="landing-lead">
            <T id="app.page.3" />
          </p>
          <div className="landing-actions">
            <Link className="ui-button" data-variant="default" href="/setup">
              <T id="app.page.4" />
            </Link>
            <Link className="ui-button" data-variant="secondary" href="/sample">
              <T id="app.page.5" />
            </Link>
          </div>
          <p className="landing-meta">
            <T id="app.page.6" />
          </p>
          <p className="landing-availability">
            {demo ? t('public.dynamic.13') : t('public.dynamic.14')}
          </p>
        </div>
        <figure className="ui-card landing-snippet" aria-label={t('public.dynamic.15')}>
          <figcaption>
            <Eyebrow>
              <T id="app.page.7" />
            </Eyebrow>
            <span className="landing-meta">
              <T id="components.room.feedback.card.2" />
            </span>
          </figcaption>
          <h2>
            <SafeText text={question?.prompt ?? 'A practice question'} />
          </h2>
          <div className="landing-excerpt">
            <MarkedTranscript text={excerpt} marks={marks} />
          </div>
          <ScoreStrip scores={scores} />
          <div className="landing-rewrite">
            <Eyebrow>
              <T id="app.page.9" />
            </Eyebrow>
            <p>
              <SafeText text={feedback?.improvements[0]?.point ?? ''} />
            </p>
            <p>
              <T id="app.page.10" />
              <SafeText text={feedback?.improvements[0]?.rewrite ?? ''} />”
            </p>
            <Link href="/sample">
              <T id="app.page.11" />
            </Link>
          </div>
        </figure>
      </section>
      <section id="how" className="landing-section landing-surface">
        <div className="container">
          <Eyebrow>
            <T id="app.page.12" />
          </Eyebrow>
          <h2>
            <T id="app.page.13" />
          </h2>
          <ol className="landing-steps">
            <li>
              <span className="landing-meta">01</span>
              <h3>
                <T id="app.page.14" />
              </h3>
              <p>{demo ? t('public.dynamic.16') : t('public.dynamic.17')}</p>
              <div className="landing-inset">
                <T id="app.page.15" />
              </div>
            </li>
            <li>
              <span className="landing-meta">02</span>
              <h3>
                <T id="app.page.16" />
              </h3>
              <p>
                <T id="app.page.17" />
                {SESSION.THINK_SECONDS}
                <T id="app.page.18" />
              </p>
              <div className="landing-inset">
                <T id="app.page.19" />
              </div>
            </li>
            <li>
              <span className="landing-meta">03</span>
              <h3>
                <T id="app.page.20" />
              </h3>
              <p>{demo ? t('public.dynamic.18') : t('public.dynamic.19')}</p>
              <div className="landing-inset">
                <T id="app.page.21" />
              </div>
            </li>
          </ol>
        </div>
      </section>
      <section className="landing-section">
        <div className="landing-dimensions container">
          <div>
            <Eyebrow>
              <T id="app.page.22" />
            </Eyebrow>
            <h2>
              <T id="app.page.23" />
            </h2>
            <p>
              <T id="app.page.24" />
            </p>
          </div>
          <dl>
            {dimensions.map(([name, description]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      <section id="self-host" className="landing-section stage">
        <div className="container">
          <Eyebrow>
            <T id="app.page.25" />
          </Eyebrow>
          <h2>
            <T id="app.page.26" />
          </h2>
          <p>
            <T id="app.page.27" />
          </p>
          <div className="landing-comparison">
            <table>
              <caption>
                <T id="app.page.28" />
              </caption>
              <thead>
                <tr>
                  <th scope="col">
                    <T id="app.page.29" />
                  </th>
                  <th scope="col">
                    <T id="app.page.30" />
                  </th>
                  <th scope="col">
                    <T id="app.page.31" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  [t('app.privacy.page.16'), t('public.dynamic.20'), t('public.dynamic.21')],
                  [t('public.dynamic.22'), t('public.dynamic.23'), t('public.dynamic.24')],
                  [t('language.label'), t('language.en'), t('public.dynamic.25')],
                  [t('public.dynamic.26'), t('public.dynamic.27'), t('public.dynamic.28')],
                ].map(([feature, demo, full]) => (
                  <tr key={feature}>
                    <th scope="row">{feature}</th>
                    <td>{demo}</td>
                    <td>{full}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="landing-actions">
            <a
              className="ui-button"
              data-variant="on-dark"
              href="https://github.com/firatkill/rehearse#readme"
            >
              <T id="app.page.32" />
            </a>
            <Link href="/privacy">
              <T id="app.page.33" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
