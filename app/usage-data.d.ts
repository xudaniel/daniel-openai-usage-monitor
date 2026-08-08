export function crossedThreshold(previousCredits: number, nextCredits: number, threshold: number): boolean;
export function readingsToCsv(readings: Array<Record<string, unknown>>): string;
export function parseUsageImport(text: string): {
  readings: Array<Record<string, unknown>>;
  settings?: Record<string, unknown>;
  resetAt?: string;
};
