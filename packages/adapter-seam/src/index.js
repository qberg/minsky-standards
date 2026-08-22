const warnedSeams = new Set();
const isProduction = () => process.env.NODE_ENV === "production";
const refuseFake = (seam) => {
    throw new Error(`[${seam}] misconfigured: required credentials unset; refusing the Fake fallback in production`);
};
const warnFakeOnce = (seam) => {
    if (warnedSeams.has(seam)) {
        return;
    }
    warnedSeams.add(seam);
    // biome-ignore lint/suspicious/noConsole: one-time dev-only misconfig warning
    console.warn(`[${seam}] required credentials unset, using in-memory Fake`);
};
export const resolveAdapter = (args) => {
    if (args.credsPresent) {
        return args.real();
    }
    if (isProduction()) {
        return refuseFake(args.seam);
    }
    warnFakeOnce(args.seam);
    return args.fake();
};
//# sourceMappingURL=index.js.map