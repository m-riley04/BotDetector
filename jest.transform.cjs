const { transformSync } = require('esbuild');

/**
 * Compiles TS/ESM sources to CommonJS for Jest using the project's existing esbuild.
 */
module.exports = {
  process(sourceText, sourcePath) {
    if (sourcePath.endsWith('.css')) {
      return { code: `module.exports = ${JSON.stringify(sourceText)};` };
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
