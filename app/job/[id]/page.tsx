import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEnv } from '@/lib/env';
import { demoJobs } from '@/lib/demo/content';
import { SafeText } from '@/components/common/safe-text';
export default async function DemoJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job =
    getEnv().APP_EDITION === 'demo' ? demoJobs.find((item) => item.slug === id) : undefined;
  if (!job) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-10">
      <p>Example job post · Fictional company</p>
      <h1>
        <SafeText text={job.role} />
      </h1>
      <h2>
        <SafeText text={job.company} />
      </h2>
      <section>
        <h2>What we read</h2>
        <SafeText text={job.text} />
      </section>
      <section>
        <h2>Example questions</h2>
        <p>Pre-written examples. No AI is called in the demo.</p>
        {job.provenance === 'pending-owner-generation' && (
          <p>Provisional examples: owner-generated content is pending.</p>
        )}
        <ol>
          {job.questions.map((question) => (
            <li key={question.id} className="my-4 rounded-2xl border p-4">
              <SafeText text={question.prompt} />
              <p className="text-sm">
                From the post: <SafeText text={question.groundingQuote} />
              </p>
            </li>
          ))}
        </ol>
      </section>
      <Link className="button" href={`/setup?demoJob=${job.slug}`}>
        Practise with these example questions
      </Link>
    </div>
  );
}
