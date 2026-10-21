import { expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { SafeText } from '@/components/common/safe-text';
it('TC-045 CT-09 SafeText renders literal HTML and highlights placeholders', () => {
  const { container } = render(<SafeText text={'<b>Example</b> [metric] **plain**'} />);
  expect(container).toHaveTextContent('<b>Example</b> [metric] **plain**');
  expect(container.querySelector('b')).toBeNull();
  expect(container.querySelector('.placeholder')).toHaveTextContent('[metric]');
});
