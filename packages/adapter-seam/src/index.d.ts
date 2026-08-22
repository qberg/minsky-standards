export type ResolveAdapterArgs<T> = {
    readonly seam: string;
    readonly credsPresent: boolean;
    readonly real: () => T;
    readonly fake: () => T;
};
export declare const resolveAdapter: <T>(args: ResolveAdapterArgs<T>) => T;
//# sourceMappingURL=index.d.ts.map