import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Eyebrow } from '@/components/ui/eyebrow';
import { Chip } from '@/components/ui/chip';
import { Segmented } from '@/components/ui/segmented';
import { ScoreBar } from '@/components/ui/score-bar';
import { ScoreStrip } from '@/components/ui/score-strip';
import { DeltaBadge } from '@/components/ui/delta-badge';
import { DemoBanner } from '@/components/ui/demo-banner';
import { ProgressSegments } from '@/components/ui/progress-segments';
import { MarkedTranscript } from '@/components/ui/marked-transcript';
import { HeatCell } from '@/components/ui/heat-cell';

it.each(['primary', 'secondary', 'on-dark', 'text'] as const)(
  'TC-135 V-10 Button %s supports disabled and named actions',
  (variant) => {
    render(
      <Button variant={variant} disabled>
        Continue
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  },
);
it('TC-135 V-10 Chip toggles and Segmented has native mutually exclusive radios', () => {
  function Controls() {
    const [selected, setSelected] = useState(false);
    const [value, setValue] = useState('voice');
    return (
      <>
        <Chip
          selected={selected}
          onClick={() => {
            setSelected(!selected);
          }}
        >
          Technical
        </Chip>
        <Segmented
          label="Answer by"
          value={value}
          onChange={setValue}
          options={[
            { value: 'voice', label: 'Voice' },
            { value: 'text', label: 'Typing' },
            { value: 'later', label: 'Unavailable', disabled: true },
          ]}
        />
      </>
    );
  }
  render(<Controls />);
  const chip = screen.getByRole('button', { name: 'Technical' });
  fireEvent.click(chip);
  expect(chip).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('radio', { name: 'Voice' })).toBeChecked();
  fireEvent.click(screen.getByRole('radio', { name: 'Typing' }));
  expect(screen.getByRole('radio', { name: 'Voice' })).not.toBeChecked();
  expect(screen.getByRole('radio', { name: 'Typing' })).toBeChecked();
  expect(screen.getByRole('radio', { name: 'Unavailable' })).toBeDisabled();
});
it('TC-135 V-10 Eyebrow and Card preserve caller content', () => {
  render(
    <Card>
      <Eyebrow>General practice</Eyebrow>
      <h2>Pick a role</h2>
    </Card>,
  );
  expect(screen.getByText('General practice')).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Pick a role' })).toBeVisible();
});
it('TC-135 V-10 ScoreBar is decorative; ScoreStrip supplies every text equivalent', () => {
  const { container } = render(
    <>
      <ScoreBar score={1} />
      <ScoreStrip
        scores={{
          structure: 1,
          specificity: 2,
          ownership: 3,
          impact: 4,
          relevance: null,
          clarity: 3,
        }}
      />
    </>,
  );
  expect(container.querySelector('.ui-score-bar')).toHaveAttribute('aria-hidden', 'true');
  expect(screen.getByText('Structure: 1 out of 4')).toBeInTheDocument();
  expect(screen.getByText('Relevance: Not scored')).toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(6);
});
it.each([
  [1, '+1.0'],
  [-1, '-1.0'],
  [0, '0.0'],
  [null, '—'],
] as const)('TC-135 V-10 DeltaBadge %s is readable', (value, text) => {
  render(<DeltaBadge value={value} />);
  expect(screen.getByText(text)).toBeVisible();
});
it('TC-135 V-10 DemoBanner has exact disclosure only in demo', () => {
  const { rerender } = render(<DemoBanner edition="full" />);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  rerender(<DemoBanner edition="demo" />);
  expect(screen.getByRole('status')).toHaveTextContent(
    'You’re trying the demo. Feedback here is pre-written sample data and no AI is called.',
  );
  expect(screen.getByRole('link')).toHaveAttribute('href', '/#self-host');
});
it('TC-135 V-10 ProgressSegments retains a readable counter', () => {
  const { container } = render(<ProgressSegments current={1} total={3} />);
  expect(screen.getByText('Question 2 of 3')).toBeVisible();
  expect(container.querySelector('[data-state="done"]')).toBeInTheDocument();
  expect(container.querySelector('.ui-progress')).toHaveAttribute('aria-hidden', 'true');
});
it.each([1, 2, 3, 4, null])('TC-135 V-10 HeatCell includes text for %s', (score) => {
  render(<HeatCell score={score} />);
  expect(screen.getByText(score === null ? 'Not scored' : String(score))).toBeInTheDocument();
});
it('TC-135 V-10 MarkedTranscript preserves hostile text and ignores invalid/overlapping ranges', () => {
  const text = 'I shipped <script>alert(1)</script>, um, it went well.';
  const { container } = render(
    <MarkedTranscript
      text={text}
      marks={[
        { start: 0, end: 9, kind: 'strong' },
        { start: 3, end: 12, kind: 'vague' },
        { start: -1, end: 2, kind: 'filler' },
        { start: 40, end: 500, kind: 'filler' },
        { start: 36, end: 38, kind: 'filler' },
        { start: 40, end: 52, kind: 'vague' },
      ]}
    />,
  );
  expect(container.querySelector('script')).toBeNull();
  expect(container.querySelector('.ui-marked-text')).toHaveTextContent(text);
  expect(screen.getByRole('list', { name: 'Transcript legend' })).toBeVisible();
  expect(container.querySelectorAll('.ui-marked-text mark')).toHaveLength(3);
});
it('TC-135 V-10 MarkedTranscript handles empty text', () => {
  const { container } = render(<MarkedTranscript text="" />);
  expect(container.querySelector('.ui-marked-text')).toBeEmptyDOMElement();
});
