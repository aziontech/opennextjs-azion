export type ProjectOptions = {
  // Next app root folder
  sourceDir: string;
  // Whether the Next.js build should be skipped (i.e. if the `.next` dir is already built)
  skipNextBuild: boolean;
  // Whether minification of the worker should be enabled
  minify: boolean;
};
