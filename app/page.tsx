import { getEnv } from '@/lib/env';
import type { Metadata } from 'next';
import Link from 'next/link';
import sample from '@/content/sample/session.json';
import { SampleFileSchema } from '@/lib/storage/sample-schema';
import { DIMENSIONS, SESSION, type Dimension } from '@/lib/config';
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
  const demo = getEnv().APP_EDITION === 'demo';
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
            <Link className="ui-button" data-variant="default" href="/setup">
              Start practising
            </Link>
            <Link className="ui-button" data-variant="secondary" href="/sample">
              See a sample report
            </Link>
          </div>
          <p className="landing-meta">No account · voice or typing · your sessions stay with you</p>
          <p className="landing-availability">
            {demo
              ? 'Available now: role-based practice, retries and example job-post interviews in English. Practise with your own job posts in the self-hosted version; Turkish is coming later.'
              : 'Available now: role-based practice, retries and interviews based on your job posts in English. Turkish is coming later.'}
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
                {demo
                  ? 'Practise from hand-written questions by role and seniority, or try one of three example job posts. Use your own job posts in the self-hosted version.'
                  : 'Practise from hand-written questions by role and seniority, or paste a job post or link to generate questions grounded in that role.'}
              </p>
              <div className="landing-inset">Frontend · Backend · Full-stack</div>
            </li>
            <li>
              <span className="landing-meta">02</span>
              <h3>Answer out loud</h3>
              <p>
                The interviewer reads the question. You get {SESSION.THINK_SECONDS} seconds to
                think, then you speak and watch the transcript. Fix misheard words before you review
                your answer.
              </p>
              <div className="landing-inset">Or type your answer. The same rubric applies.</div>
            </li>
            <li>
              <span className="landing-meta">03</span>
              <h3>See what to say better</h3>
              <p>
                {demo
                  ? 'Explore pre-written sample feedback with six scores and a rewrite to try. Retry the question to practise your answer; the demo does not score your words.'
                  : 'Every scored answer gets six scores, evidence from your answer and a rewrite to try. Retry the question to practise what you learned.'}
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
            The public demo uses pre-written feedback and keeps sessions in your browser. Run the
            full version with your own OpenAI key and save sessions in SQLite on your machine. The
            setup guide covers Docker and local installation.
          </p>
          <div className="landing-comparison">
            <table>
              <caption>Demo and self-hosted editions</caption>
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
                  ['Language', 'English', 'English; Turkish is coming later'],
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
            <a
              className="ui-button"
              data-variant="on-dark"
              href="https://github.com/firatkill/rehearse#readme"
            >
              Read the setup guide
            </a>
            <Link href="/privacy">Where your words go</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
