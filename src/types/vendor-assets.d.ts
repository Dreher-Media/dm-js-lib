// Files the Rollup build inlines from the `plyr` package (see rollup.config.mjs).
declare module 'dm-plyr:js' {
  const Plyr: {
    setup(targets: unknown, options?: unknown): unknown[];
    defaults: Record<string, unknown>;
  };
  export default Plyr;
}
declare module 'dm-plyr:css' {
  const css: string;
  export default css;
}
declare module 'dm-plyr:svg' {
  const svg: string;
  export default svg;
}
