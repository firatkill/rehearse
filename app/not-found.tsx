import { T } from '@/lib/i18n/context';
import { LanguageLink as Link } from '@/lib/i18n/link';
export default function NotFound() {
  return (
    <>
      <h1>
        <T id="app.not.found.1" />
      </h1>
      <p>
        <T id="app.not.found.2" />
      </p>
      <Link href="/">
        <T id="app.error.4" />
      </Link>
    </>
  );
}
