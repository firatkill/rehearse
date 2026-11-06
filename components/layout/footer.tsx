import { T } from '@/lib/i18n/context';
import { LanguageLink as Link } from '@/lib/i18n/link';
export function Footer() {
  return (
    <footer className="site-footer container">
      <p>
        <T id="components.layout.footer.1" />
        <a href="https://firatkil.com">
          <T id="components.layout.footer.2" />
        </a>{' '}
        ·{' '}
        <a href="https://github.com/firatkill/rehearse">
          <T id="components.layout.footer.3" />
        </a>
      </p>
      <div className="footer-links">
        <Link href="/sample">
          <T id="components.layout.footer.4" />
        </Link>
        <Link href="/privacy">
          <T id="components.layout.footer.5" />
        </Link>
      </div>
    </footer>
  );
}
