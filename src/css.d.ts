// CSS files are bundled as raw strings (esbuild/Jest "text" loader) so they can go into shadow roots.
declare module '*.css' {
  const css: string;
  export default css;
}
