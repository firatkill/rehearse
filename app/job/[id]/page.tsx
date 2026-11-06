import { serverTranslator } from '@/lib/i18n/server';
import { T } from '@/lib/i18n/context';
import { LanguageLink as Link } from '@/lib/i18n/link';
export async function generateMetadata() {
  const t = await serverTranslator();
  return { title: t('title.job') };
}
import { z } from 'zod';
import { getJobRepository } from '@/lib/jobpost/repository';
import { JobPost } from '@/components/jobpost/job-post';
import { notFound } from 'next/navigation';
import { getEnv } from '@/lib/env';
import { demoJobs } from '@/lib/demo/content';
import { SafeText } from '@/components/common/safe-text';
export default async function DemoJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (getEnv().APP_EDITION === 'full') {
    if (!z.uuid().safeParse(id).success) notFound();
    const repo = getJobRepository();
    const post = repo.get(id);
    if (!post) notFound();
    return <JobPost initial={{ post, questions: repo.questions(id) }} />;
  }
  const job =
    getEnv().APP_EDITION === 'demo' ? demoJobs.find((item) => item.slug === id) : undefined;
  if (!job) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-10">
      <p>
        <T id="app.job.id.page.1" />
      </p>
      <h1>
        <SafeText text={job.role} />
      </h1>
      <h2>
        <SafeText text={job.company} />
      </h2>
      <section>
        <h2>
          <T id="components.jobpost.job.post.1" />
        </h2>
        <SafeText text={job.text} />
      </section>
      <section>
        <h2>
          <T id="app.job.id.page.3" />
        </h2>
        <p>
          <T id="app.job.id.page.4" />
        </p>
        {job.provenance === 'pending-owner-generation' && (
          <p>
            <T id="app.job.id.page.5" />
          </p>
        )}
        <ol>
          {job.questions.map((question) => (
            <li key={question.id} className="my-4 rounded-2xl border p-4">
              <SafeText text={question.prompt} />
              <p className="text-sm">
                <T id="app.job.id.page.6" />
                <SafeText text={question.groundingQuote} />
              </p>
            </li>
          ))}
        </ol>
      </section>
      <Link className="button" href={`/setup?demoJob=${job.slug}`}>
        <T id="app.job.id.page.7" />
      </Link>
    </div>
  );
}
