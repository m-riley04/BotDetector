import { cp, mkdir, rm } from 'node:fs/promises';
import { watch as watchDirectory } from 'node:fs';
import { build, context } from 'esbuild';

const outputDirectory = 'dist';
const watch = process.argv.includes('--watch');
const staticFiles = ['manifest.json', 'popup.html', 'popup.css'];

const jsx = {
  jsx: 'automatic',
  jsxImportSource: 'preact',
  loader: { '.css': 'text' },
};

const builds = [
  {
    entryPoints: ['src/popup.tsx'],
    bundle: true,
    format: 'iife',
    target: 'firefox128',
    outdir: outputDirectory,
    ...jsx,
  },
  {
    entryPoints: ['src/content.ts', 'src/inject.ts', 'src/background.ts'],
    bundle: true,
    format: 'iife',
    target: 'firefox128',
    outdir: `${outputDirectory}/src`,
    ...jsx,
  },
];

function loggingPlugin(name) {
  let buildCount = 0;

  return {
    name: 'build-logging',
    setup(build) {
      build.onStart(() => {
        if (buildCount === 0) {
          console.log(`Building ${name}...`);
        } else {
          console.log(`Change detected; rebuilding ${name}...`);
        }
        buildCount += 1;
      });
      build.onEnd((result) => {
        console.log(
          result.errors.length === 0
            ? `Build finished: ${name}.`
            : `Build failed: ${name}.`
        );
      });
    },
  };
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(`${outputDirectory}/src`, { recursive: true });

for (const file of staticFiles) {
  await cp(file, `${outputDirectory}/${file}`);
}

if (watch) {
  const contexts = await Promise.all(
    builds.map((options, index) =>
      context({
        ...options,
        plugins: [
          loggingPlugin(
            index === 0 ? 'popup' : 'content and background scripts'
          ),
        ],
      })
    )
  );
  await Promise.all(contexts.map((buildContext) => buildContext.watch()));
  const fileWatcher = watchDirectory('.', (_eventType, filename) => {
    const file = filename?.toString();
    if (file && staticFiles.includes(file)) {
      console.log(`Change detected; copying ${file}...`);
      void cp(file, `${outputDirectory}/${file}`)
        .then(() => console.log(`Copy finished: ${file}.`))
        .catch((error) => console.error(`Failed to copy ${file}:`, error));
    }
  });
  console.log('Watching for changes. Press q to quit.');

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.setEncoding('utf8');
  process.stdin.resume();

  let stopping = false;
  process.stdin.on('data', async (input) => {
    if (
      stopping ||
      (!input.toLowerCase().includes('q') && !input.includes('\u0003'))
    ) {
      return;
    }

    stopping = true;
    console.log('Stopping watch...');
    fileWatcher.close();
    try {
      await Promise.all(contexts.map((buildContext) => buildContext.dispose()));
    } catch (error) {
      console.error('Failed to stop build watchers:', error);
      process.exitCode = 1;
    } finally {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
    }
  });
} else {
  await Promise.all(builds.map((options) => build(options)));
}
