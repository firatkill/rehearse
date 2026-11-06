'use client';
import { T } from '@/lib/i18n/context';
import { LanguageLink as Link } from '@/lib/i18n/link';
export default function ErrorPage() {
  return (
    <>
      <h1>
        <T id="app.error.1" />
      </h1>
      <p>
        <T id="app.error.2" />
      </p>
      <button
        type="button"
        onClick={() => {
          window.location.reload();
        }}
      >
        <T id="app.error.3" />
      </button>
      <Link href="/">
        <T id="app.error.4" />
      </Link>
    </>
  );
}
