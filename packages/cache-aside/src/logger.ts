export type CacheLogLevel = "debug" | "error" | "info" | "warn";

export type CacheLogEntry = {
  readonly level: CacheLogLevel;
  readonly message: string;
  readonly fields: Record<string, unknown>;
};

export type CacheLogger = (entry: CacheLogEntry) => void;

export const silentLogger: CacheLogger = () => {
  return;
};
