import type { IConfiguration, IForbiddenRuleType } from "dependency-cruiser";
export type ArchitectureOptions = {
    readonly srcRoot?: string;
    readonly buckets?: string;
    readonly compositionRoot?: string;
    readonly transport?: string;
    readonly handlerMount?: string;
    readonly entryPoints?: readonly string[];
};
export declare function createArchitectureRules(options?: ArchitectureOptions): IForbiddenRuleType[];
export type DepcruiseConfigOptions = ArchitectureOptions & {
    readonly tsConfigFileName?: string;
    readonly extraRules?: readonly IForbiddenRuleType[];
};
export declare function defineDepcruiseConfig(options?: DepcruiseConfigOptions): IConfiguration;
//# sourceMappingURL=index.d.ts.map