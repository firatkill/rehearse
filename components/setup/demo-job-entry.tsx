'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
export function DemoJobEntry() {
  const [submitted, setSubmitted] = useState(false);
  return (
    <>
      <label htmlFor="job-post-input">Job post link or text</label>
      <textarea id="job-post-input" rows={3} placeholder="https://… or paste the description" />
      <Button
        type="button"
        onClick={() => {
          setSubmitted(true);
        }}
      >
        Read the job post
      </Button>
      {submitted && (
        <p role="status">
          Job-post interviews run in the self-hosted version. Try one of these example posts:
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
