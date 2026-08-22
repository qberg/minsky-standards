// One fail-closed policy for every "real vs Fake adapter" seam (search, storage, stt,
// mail). Creds absent in production refuses the Fake; dev and tests warn once.
export type ResolveAdapterArgs<T> = {
  readonly seam: string;
  readonly credsPresent: boolean;
  readonly real: () => T;
  readonly fake: () => T;
};

const warnedSeams = new Set<string>();

const isProduction = (): boolean => process.env.NODE_ENV === "production";

const refuseFake = (seam: string): never => {
  throw new Error(
    `[${seam}] misconfigured: required credentials unset; refusing the Fake fallback in production`
  );
};

const warnFakeOnce = (seam: string): void => {
  if (warnedSeams.has(seam)) {
    return;
  }
  warnedSeams.add(seam);
  // biome-ignore lint/suspicious/noConsole: one-time dev-only misconfig warning
  console.warn(`[${seam}] required credentials unset, using in-memory Fake`);
};

export const resolveAdapter = <T>(args: ResolveAdapterArgs<T>): T => {
  if (args.credsPresent) {
    return args.real();
  }
  if (isProduction()) {
    return refuseFake(args.seam);
  }
  warnFakeOnce(args.seam);
  return args.fake();
};
