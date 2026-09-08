export type ResolveAdapterArgs<T> = {
  readonly seam: string;
  readonly credsPresent: boolean;
  readonly isProduction: boolean;
  readonly real: () => T;
  readonly fake: () => T;
};

const warnedSeams = new Set<string>();

const refuseFake = (seam: string): never => {
  throw new Error(
    `[${seam}] misconfigured: required credentials unset; refusing the fake fallback in production`
  );
};

const warnFakeOnce = (seam: string): void => {
  if (warnedSeams.has(seam)) {
    return;
  }
  warnedSeams.add(seam);
  process.emitWarning(
    `[${seam}] required credentials unset, using the fake`,
    "AdapterFallback"
  );
};

/** Production is an argument, not a NODE_ENV read: explicit env input, testable, browser-safe. */
export const resolveAdapter = <T>(args: ResolveAdapterArgs<T>): T => {
  if (args.credsPresent) {
    return args.real();
  }
  if (args.isProduction) {
    return refuseFake(args.seam);
  }
  warnFakeOnce(args.seam);
  return args.fake();
};

/** Test seam: the warn-once memory is process-global by design. */
export const resetAdapterWarnings = (): void => warnedSeams.clear();
