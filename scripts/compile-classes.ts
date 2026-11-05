import { build } from 'cn/build';
import { writeFile } from 'node:fs/promises';

/** Fit the already-installed merger to repository-controlled class names at build time. */
export async function compileClasses() {
  const result = await build({
    content: [
      'app/**/*.{ts,tsx}',
      'components/**/*.{ts,tsx}',
      'hooks/**/*.{ts,tsx}',
      'lib/**/*.{ts,tsx}',
    ],
    css: 'app/globals.css',
    out: '.generated/cn-tables.mjs',
  });
  await writeFile(
    '.generated/cn-runtime.mjs',
    "import tables from './cn-tables.mjs';\nimport { createCn } from 'cn/engine';\nexport const cn = createCn(tables);\n",
  );
  return result;
}
