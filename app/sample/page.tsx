import sample from '@/content/sample/session.json';
import { SampleFileSchema } from '@/lib/storage/sample-schema';
import { Eyebrow } from '@/components/ui/eyebrow';
import { ReportView } from '@/components/report/report-view';
export const metadata = { title: 'Sample report · Rehearse' };
export default function SamplePage() {
  const data = SampleFileSchema.parse(sample);
  return (
    <div className="sample-page">
      <Eyebrow>A practice session, start to finish</Eyebrow>
      <p className="sample-notice">
        This is a sample session with answers written for the demo. The candidate is fictional. No
        language model was called to show this page.
      </p>
      <ReportView {...data} source="sample" />
    </div>
  );
}
