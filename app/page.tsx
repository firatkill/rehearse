import { getEnv } from '@/lib/env';
import type { Metadata } from 'next';
import Link from 'next/link';
import sample from '@/content/sample/session.json';
import { SampleFileSchema } from '@/lib/storage/sample-schema';
import { DIMENSIONS, SESSION, type Dimension } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Eyebrow } from '@/components/ui/eyebrow';
import { ScoreStrip } from '@/components/ui/score-strip';
import { MarkedTranscript } from '@/components/ui/marked-transcript';
import { SafeText } from '@/components/common/safe-text';

export const metadata: Metadata = {
  title: 'Rehearse: practise interviews out loud',
  description:
    'Practise interviews out loud or by typing. Get clear feedback on six dimensions and see what to say better.',
};
const dimensions = [
  ['Structure', 'Situation, action, result in order. Or definition, example, trade-offs.'],
  ['Specificity', 'Systems, numbers, constraints, tool names.'],
  ['Ownership', 'What you did, said with “I”, apart from the team.'],
  ['Impact', 'The result, measured where possible.'],
  ['Relevance', 'Whether you answered the question asked.'],
  ['Clarity', 'Whether a listener follows it the first time.'],
];
export default function Home() {
  const data = SampleFileSchema.parse(sample);
  const answer = data.answers.find((a) => a.feedback !== null);
  const question = data.session.questions.find((q) => q.id === answer?.questionId);
  const feedback = answer?.feedback;
  const excerpt =
    answer?.transcript
      .split(/(?<=\.)\s/)
      .slice(0, 2)
      .join(' ') ?? '';
  const marks =
    feedback?.strengths.flatMap((s) => {
      const start = excerpt.indexOf(s.evidence ?? '');
      return s.evidence && start >= 0
        ? [{ start, end: start + s.evidence.length, kind: 'strong' as const }]
        : [];
    }) ?? [];
  const scores = Object.fromEntries(
    DIMENSIONS.map((d) => [d, feedback?.scores[d].score ?? null]),
  ) as Record<Dimension, number | null>;
  return (
    <div className="landing">
      <section className="landing-hero container">
        <div className="landing-intro">
          <Eyebrow>Interview practice, out loud</Eyebrow>
          <h1>Rehearse the interview before you have it.</h1>
          <p className="landing-lead">
            Rehearse asks the questions, listens to your answer, and shows you what to say better.
          </p>
          <div className="landing-actions">
            <Button asChild>
              <Link href="/setup">Start practising</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/sample">See a sample report</Link>
            </Button>
          </div>
          <p className="landing-meta">No account · voice or typing · your sessions stay with you</p>
          <p className="landing-availability">
            {getEnv().APP_EDITION === 'demo'
              ? 'Available now: role-based practice, retries and example job-post interviews in English. Your own job posts are coming next in the self-hosted version; Turkish is coming later.'
              : 'Available now: role-based practice and retries in English. Your own job-post interviews are coming next; Turkish is coming later.'}
          </p>
        </div>
        <figure className="ui-card landing-snippet" aria-label="Example of feedback on an answer">
          <figcaption>
            <Eyebrow>From the sample session</Eyebrow>
            <span className="landing-meta">Sample feedback</span>
          </figcaption>
          <h2>
            <SafeText text={question?.prompt ?? 'A practice question'} />
          </h2>
          <div className="landing-excerpt">
            <MarkedTranscript text={excerpt} marks={marks} />
          </div>
          <ScoreStrip scores={scores} />
          <div className="landing-rewrite">
            <Eyebrow>Change one thing</Eyebrow>
            <p>
              <SafeText text={feedback?.improvements[0]?.point ?? ''} />
            </p>
            <p>
              Try saying: “<SafeText text={feedback?.improvements[0]?.rewrite ?? ''} />”
            </p>
            <Link href="/sample">Read the full sample report</Link>
          </div>
        </figure>
      </section>
      <section id="how" className="landing-section landing-surface">
        <div className="container">
          <Eyebrow>How a session works</Eyebrow>
          <h2>Answer, see what to fix, practise again.</h2>
          <ol className="landing-steps">
            <li>
              <span className="landing-meta">01</span>
              <h3>Bring the job, or pick a role</h3>
              <p>
                Practise from a bank of hand-written questions by role and seniority. Job-post
                questions are coming to the self-hosted version.
              </p>
              <div className="landing-inset">Frontend · Backend · Full-stack</div>
            </li>
            <li>
              <span className="landing-meta">02</span>
              <h3>Answer out loud</h3>
              <p>
                The interviewer reads the question. You get {SESSION.THINK_SECONDS} seconds to
                think, then you speak and watch the transcript. Fix misheard words before it’s
                scored.
              </p>
              <div className="landing-inset">Or type your answer. The same rubric applies.</div>
            </li>
            <li>
              <span className="landing-meta">03</span>
              <h3>See what to say better</h3>
              <p>
                Every scored answer gets six scores, quotes from what you said and a rewrite to try.
                Start another session to practise what you learned.
              </p>
              <div className="landing-inset">One concrete change for your next answer.</div>
            </li>
          </ol>
        </div>
      </section>
      <section className="landing-section">
        <div className="landing-dimensions container">
          <div>
            <Eyebrow>What the feedback looks at</Eyebrow>
            <h2>Six things interviewers listen for.</h2>
            <p>
              Pace, filler words and pauses are counted in your browser, not by the language model.
            </p>
          </div>
          <dl>
            {dimensions.map(([name, description]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      <section id="self-host" className="landing-section stage">
        <div className="container">
          <Eyebrow>Two ways to use it</Eyebrow>
          <h2>Try the demo. Run the full version on your machine.</h2>
          <p>
            The two editions below are being built. This preview stores sessions in your browser;
            the self-hosted setup guide will be added when it is ready.
          </p>
          <div className="landing-comparison">
            <table>
              <caption>Planned demo and self-hosted editions</caption>
              <thead>
                <tr>
                  <th scope="col">Feature</th>
                  <th scope="col">Demo, on the public site</th>
                  <th scope="col">Full version, self-hosted</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Feedback', 'Pre-written sample feedback', 'Scored live on your own answer'],
                  [
                    'Job posts',
                    'Three example posts',
                    'Any link or pasted text, with more questions on demand',
                  ],
                  ['Language', 'English', 'English and Turkish'],
                  ['History', 'This browser only', 'Saved on your machine, across browsers'],
                ].map(([feature, demo, full]) => (
                  <tr key={feature}>
                    <th scope="row">{feature}</th>
                    <td>{demo}</td>
                    <td>{full}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="landing-actions">
            <Button variant="on-dark" asChild>
              <a href="https://github.com/firatkill/rehearse#readme">Read the setup guide</a>
            </Button>
            <Link href="/privacy">Where your words go</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
