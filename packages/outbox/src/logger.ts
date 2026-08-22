export type OutboxLogLevel = "debug" | "error" | "info" | "warn";

export type OutboxLogEntry = {
  readonly level: OutboxLogLevel;
  readonly message: string;
  readonly fields: Record<string, unknown>;
};

export type OutboxLogger = (entry: OutboxLogEntry) => void;

export const silentLogger: OutboxLogger = () => {
  return;
};
