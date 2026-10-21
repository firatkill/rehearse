import Link from 'next/link';
export function Footer() {
  return (
    <footer className="site-footer container">
      <p>
        Built by Fırat Kıl · <a href="https://firatkil.com">firatkil.com</a> ·{' '}
        <a href="https://github.com/firatkill/rehearse">Source on GitHub (MIT)</a>
      </p>
      <p>
        Your sessions stay in this browser. Answers are sent to the server only to get feedback and
        are not stored. <Link href="/privacy">Privacy</Link>
      </p>
    </footer>
  );
}
