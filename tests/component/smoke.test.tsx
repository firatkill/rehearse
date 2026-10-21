import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';

it('TC-010 T-04 renders a component in jsdom', () => {
  render(<p>ok</p>);
  expect(screen.getByText('ok')).toBeInTheDocument();
});
