import { cp, mkdir, rm } from 'node:fs/promises';
import { build } from 'esbuild';

const outputDirectory = 'dist';

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

await build({
  entryPoints: ['src/popup.ts'],
  bundle: true,
  format: 'iife',
  target: 'firefox128',
  outdir: outputDirectory,
});

await mkdir(`${outputDirectory}/src`, { recursive: true });
await build({
  entryPoints: ['src/content.ts', 'src/inject.ts', 'src/background.ts'],
  bundle: true,
  format: 'iife',
  target: 'firefox128',
  outdir: `${outputDirectory}/src`,
});

for (const file of ['manifest.json', 'popup.html', 'popup.css']) {
  await cp(file, `${outputDirectory}/${file}`);
}
