import { serverTranslator } from '@/lib/i18n/server';
import { T } from '@/lib/i18n/context';
import sample from '@/content/sample/session.json';
import { SampleFileSchema } from '@/lib/storage/sample-schema';
import { Eyebrow } from '@/components/ui/eyebrow';
import { ReportView } from '@/components/report/report-view';
export async function generateMetadata() {
  const t = await serverTranslator();
  return { title: t('title.sample') };
}
export default function SamplePage() {
  const data = SampleFileSchema.parse(sample);
  return (
    <div className="sample-page">
      <Eyebrow>
        <T id="app.sample.page.1" />
      </Eyebrow>
      <p className="sample-notice">
        <T id="app.sample.page.2" />
      </p>
      <ReportView {...data} source="sample" />
    </div>
  );
}
