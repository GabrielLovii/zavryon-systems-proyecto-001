// Test-only resolver: lets Node's native TypeScript support load app modules that import
// siblings without an extension ("./stock") or through the "@/" path alias from tsconfig.
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

registerHooks({
  resolve(specifier, context, nextResolve) {
    const aliased = specifier.startsWith('@/') ? pathToFileURL(path.join(root, specifier.slice(2))).href : specifier;
    const relative = aliased.startsWith('.') || aliased.startsWith('file:');
    if (relative && !path.extname(aliased) && context.parentURL) {
      const base = aliased.startsWith('file:') ? fileURLToPath(aliased) : path.resolve(path.dirname(fileURLToPath(context.parentURL)), aliased);
      for (const candidate of [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) if (existsSync(candidate)) return nextResolve(pathToFileURL(candidate).href, context);
    }
    return nextResolve(aliased, context);
  },
});
