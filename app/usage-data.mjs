export function crossedThreshold(previousCredits, nextCredits, threshold) {
  return previousCredits > threshold && nextCredits <= threshold;
}

export function readingsToCsv(readings) {
  const header = "id,credits,weeklyRemaining,capturedAt,source";
  const rows = readings.map((reading) => [
    reading.id,
    reading.credits,
    reading.weeklyRemaining,
    reading.capturedAt,
    reading.source,
  ].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","));
  return [header, ...rows].join("\n");
}

export function parseUsageImport(text) {
  const payload = JSON.parse(text);
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.readings)) {
    throw new Error("This file is not a Usage Pulse export.");
  }

  const readings = payload.readings.map((reading) => {
    if (
      !reading ||
      typeof reading.id !== "string" ||
      !Number.isFinite(reading.credits) ||
      reading.credits < 0 ||
      !Number.isFinite(reading.weeklyRemaining) ||
      reading.weeklyRemaining < 0 ||
      reading.weeklyRemaining > 100 ||
      typeof reading.capturedAt !== "string" ||
      Number.isNaN(Date.parse(reading.capturedAt))
    ) {
      throw new Error("The import contains an invalid reading.");
    }
    return {
      id: reading.id,
      credits: Math.round(reading.credits),
      weeklyRemaining: Math.round(reading.weeklyRemaining),
      capturedAt: new Date(reading.capturedAt).toISOString(),
      source: reading.source === "local" ? "local" : "manual",
    };
  });

  return { readings, settings: payload.settings, resetAt: payload.resetAt };
}
