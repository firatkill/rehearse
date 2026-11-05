import { expect, it } from 'vitest';
import { cn } from 'cn';
import { createCn } from 'cn/engine';
import { compileToTables } from 'cn/compiler';
import { compileClasses } from '../../scripts/compile-classes';
it('TC-193 fitted class tables retain conflict semantics for every scanned class group', async () => {
  const result = await compileClasses();
  const compiled = compileToTables(result.config);
  const fitted = createCn(compiled.tables, compiled.validatorImpls);
  for (const token of result.tokens) {
    // Exercise actual repository tokens with conflicting variants, order and conditional inputs.
    expect(fitted(token, 'px-4', false, ['text-sm', token])).toBe(
      cn(token, 'px-4', false, ['text-sm', token]),
    );
    expect(fitted('min-h-11', token, 'min-h-12')).toBe(cn('min-h-11', token, 'min-h-12'));
  }
});
