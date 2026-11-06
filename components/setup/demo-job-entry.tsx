'use client';
import { T } from '@/lib/i18n/context';
import { useState } from 'react';
import { LanguageLink as Link } from '@/lib/i18n/link';
import { Button } from '@/components/ui/button';
export function DemoJobEntry() {
  const [submitted, setSubmitted] = useState(false);
  return (
    <>
      <label htmlFor="job-post-input">
        <T id="components.setup.demo.job.entry.1" />
      </label>
      <textarea id="job-post-input" rows={3} placeholder="https://… or paste the description" />
      <Button
        type="button"
        onClick={() => {
          setSubmitted(true);
        }}
      >
        <T id="components.setup.demo.job.entry.2" />
      </Button>
      {submitted && (
        <p role="status">
          <T id="components.setup.demo.job.entry.3" />
        </p>
      )}
      <ul>
        {[
          ['northwind-pay', 'Northwind Pay'],
          ['cedar-tools', 'Cedar Tools'],
          ['harbour-health', 'Harbour Health'],
        ].map(([slug, name]) => (
          <li key={slug}>
            <Link href={`/job/${slug}`}>{name}</Link>
          </li>
        ))}
      </ul>
    </>
  );
}
