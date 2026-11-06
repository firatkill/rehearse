import { T } from '@/lib/i18n/context';
import { LanguageLink as Link } from '@/lib/i18n/link';
/** Persistent edition notice, rendered only when demo is explicitly selected. */
export function DemoBanner({ edition }: { edition: 'demo' | 'full' }) {
  return edition === 'demo' ? (
    <div className="ui-demo-banner" role="status">
      <span className="ui-demo-pill">
        <T id="components.ui.demo.banner.1" />
      </span>
      <span>
        <T id="components.ui.demo.banner.2" />
      </span>
      <Link href="/#self-host">
        <T id="components.ui.demo.banner.3" />
      </Link>
    </div>
  ) : null;
}
