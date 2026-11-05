import Link from 'next/link';
export function Footer() {
  return (
    <footer className="site-footer container">
      <p>
        Built by Fırat Kıl · <a href="https://firatkil.com">firatkil.com</a> ·{' '}
        <a href="https://github.com/firatkill/rehearse">Source on GitHub (MIT)</a>
      </p>
      <div className="footer-links">
        <Link href="/sample">Sample report</Link>
        <Link href="/privacy" prefetch={false}>
          Privacy
        </Link>
      </div>
    </footer>
  );
}
