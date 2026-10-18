const { transformSync } = require('esbuild');

/** Compiles TS/ESM sources to CommonJS for Jest using the project's existing esbuild. */
module.exports = {
  process(sourceText, sourcePath) {
    const { code, map } = transformSync(sourceText, {
      loader: sourcePath.endsWith('.ts') ? 'ts' : 'js',
      format: 'cjs',
      target: 'node18',
      sourcemap: 'both',
      sourcefile: sourcePath,
    });
    return { code, map };
  },
};
