import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { SafeText } from '@/components/common/safe-text';
it('TC-078 CT-09 visitor/model markup stays literal and only placeholders get spans', () => {
  const text = '<img src=x onerror=alert(1)> **bold** [site](javascript:alert(1)) [metric]';
  const { container } = render(
    <p>
      <SafeText text={text} />
    </p>,
  );
  expect(container.textContent).toBe(text);
  expect(container.querySelectorAll('img,script,a,strong')).toHaveLength(0);
  expect(screen.getByText('[metric]')).toHaveClass('placeholder');
});

it('TC-045 CT-09 SafeText renders literal HTML and highlights placeholders', () => {
  const { container } = render(<SafeText text={'<b>Example</b> [metric] **plain**'} />);
  expect(container).toHaveTextContent('<b>Example</b> [metric] **plain**');
  expect(container.querySelector('b')).toBeNull();
  expect(container.querySelector('.placeholder')).toHaveTextContent('[metric]');
});
