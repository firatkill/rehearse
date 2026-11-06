import { serverTranslator } from '@/lib/i18n/server';
import { T } from '@/lib/i18n/context';
import { getEnv } from '@/lib/env';
import { LanguageLink as Link } from '@/lib/i18n/link';
import { Eyebrow } from '@/components/ui/eyebrow';
export const metadata = { title: 'Privacy · Rehearse' };
export default async function PrivacyPage() {
  const t = await serverTranslator();

  const demo = getEnv().APP_EDITION === 'demo';
  return (
    <article className="info-page">
      <header>
        <Eyebrow>
          <T id="app.privacy.page.1" />
        </Eyebrow>
        <h1>
          <T id="components.layout.footer.5" />
        </h1>
        <p className="info-lead">
          <T id="app.privacy.page.3" />
        </p>
      </header>
      <section>
        <h2>{demo ? t('public.dynamic.45') : t('public.dynamic.46')}</h2>
        <p>
          {demo ? t('public.dynamic.47') : t('public.dynamic.48')} <T id="app.privacy.page.4" />{' '}
          <Link href="/progress">
            <T id="app.privacy.page.5" />
          </Link>
          .
        </p>
      </section>
      <section>
        <h2>
          <T id="app.privacy.page.6" />
        </h2>
        <p>{demo ? t('public.dynamic.49') : t('public.dynamic.50')}</p>
        <dl className="edition-privacy">
          <div>
            <dt>
              <T id="app.page.30" />
            </dt>
            <dd>
              <T id="app.privacy.page.8" />
            </dd>
          </div>
          <div>
            <dt>
              <T id="app.privacy.page.9" />
            </dt>
            <dd>
              <T id="app.privacy.page.10" />
            </dd>
          </div>
        </dl>
      </section>
      <section>
        <h2>
          <T id="app.privacy.page.11" />
        </h2>
        <p>
          <T id="app.privacy.page.12" />
        </p>
        <a href="https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition">
          <T id="app.privacy.page.13" />
        </a>
      </section>
      <section>
        <h2>
          <T id="app.privacy.page.14" />
        </h2>
        <p>
          <T id="app.privacy.page.15" />
        </p>
      </section>
      <section>
        <h2>
          <T id="app.privacy.page.16" />
        </h2>
        <p>{demo ? t('public.dynamic.51') : t('public.dynamic.52')}</p>
        <p>
          <T id="app.privacy.page.17" />
        </p>
        <a href="https://developers.openai.com/api/docs/guides/your-data">
          <T id="app.privacy.page.18" />
        </a>
        <p>{demo ? t('public.dynamic.53') : t('public.dynamic.54')}</p>
      </section>
      <section>
        <h2>
          <T id="app.privacy.page.19" />
        </h2>
        <p>{demo ? t('public.dynamic.55') : t('public.dynamic.56')}</p>
      </section>
      <section>
        <h2>
          <T id="app.privacy.page.20" />
        </h2>
        <p>
          <T id="app.privacy.page.21" /> {demo ? t('public.dynamic.57') : t('public.dynamic.58')}{' '}
          <T id="app.privacy.page.22" />
          <Link href="/progress">
            <T id="app.privacy.page.5" />
          </Link>
          .
        </p>
      </section>
      <section>
        <h2>
          <T id="app.privacy.page.24" />
        </h2>
        <p>
          <T id="app.privacy.page.25" />{' '}
          <a href="https://github.com/firatkill/rehearse/issues">
            <T id="app.privacy.page.26" />
          </a>
          <T id="app.privacy.page.27" />
          <a href="https://firatkil.com">
            <T id="components.layout.footer.2" />
          </a>
          .
        </p>
      </section>
      <p className="info-updated">
        <T id="app.privacy.page.29" />
      </p>
    </article>
  );
}
