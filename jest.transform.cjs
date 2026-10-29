// eslint-disable-next-line @typescript-eslint/no-require-imports
const { transformSync } = require('esbuild');

/**
 * Compiles TS/ESM sources to CommonJS for Jest using the project's existing esbuild.
 */
module.exports = {
  process(sourceText, sourcePath) {
    if (sourcePath.endsWith('.css')) {
      return { code: `module.exports = ${JSON.stringify(sourceText)};` };
    }
    // Mirrors esbuild's "binary" loader: the module's default export is the file's bytes.
    // Read from disk rather than sourceText, since Jest hands transforms the file as a (lossy) UTF-8 string.
    if (sourcePath.endsWith('.wasm')) {
      return {
        code: `module.exports = new Uint8Array(require('fs').readFileSync(${JSON.stringify(sourcePath)}));`,
      };
    }
    const { code, map } = transformSync(sourceText, {
      loader: /\.tsx?$/.test(sourcePath)
        ? sourcePath.endsWith('x')
          ? 'tsx'
          : 'ts'
        : 'js',
      jsx: 'automatic',
      jsxImportSource: 'preact',
      format: 'cjs',
      target: 'node18',
      sourcemap: 'both',
      sourcefile: sourcePath,
    });
    return { code, map };
  },
};
