"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { crossedThreshold, parseUsageImport, readingsToCsv } from "./usage-data.mjs";

type Reading = {
  id: string;
  credits: number;
  weeklyRemaining: number;
  capturedAt: string;
  source: "manual" | "local";
};

type Settings = {
  lowCreditThreshold: number;
  timezone: string;
  resetCadenceDays: number;
  retentionLimit: number;
  staleAfterMinutes: number;
  alertsEnabled: boolean;
  lowCreditAlerts: boolean;
  staleAlerts: boolean;
  resetAlerts: boolean;
};

const READINGS_KEY = "usage-pulse-readings";
const SETTINGS_KEY = "usage-pulse-settings";
const RESET_KEY = "usage-pulse-reset-at";
const ALERTS_KEY = "usage-pulse-alert-events";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function defaultSettings(): Settings {
  return {
    lowCreditThreshold: 125,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Toronto",
    resetCadenceDays: 7,
    retentionLimit: 30,
    staleAfterMinutes: 60,
    alertsEnabled: false,
    lowCreditAlerts: true,
    staleAlerts: true,
    resetAlerts: true,
  };
}

function validTimezone(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function normalizeSettings(value: unknown, fallback = defaultSettings()): Settings {
  const candidate = value && typeof value === "object" ? value as Partial<Settings> : {};
  return {
    lowCreditThreshold: Math.max(0, Math.round(Number(candidate.lowCreditThreshold ?? fallback.lowCreditThreshold))),
    timezone: validTimezone(candidate.timezone) ? candidate.timezone : fallback.timezone,
    resetCadenceDays: Math.max(1, Math.min(365, Math.round(Number(candidate.resetCadenceDays ?? fallback.resetCadenceDays)))),
    retentionLimit: Math.max(5, Math.min(100, Math.round(Number(candidate.retentionLimit ?? fallback.retentionLimit)))),
    staleAfterMinutes: Math.max(5, Math.min(10_080, Math.round(Number(candidate.staleAfterMinutes ?? fallback.staleAfterMinutes)))),
    alertsEnabled: typeof candidate.alertsEnabled === "boolean" ? candidate.alertsEnabled : fallback.alertsEnabled,
    lowCreditAlerts: typeof candidate.lowCreditAlerts === "boolean" ? candidate.lowCreditAlerts : fallback.lowCreditAlerts,
    staleAlerts: typeof candidate.staleAlerts === "boolean" ? candidate.staleAlerts : fallback.staleAlerts,
    resetAlerts: typeof candidate.resetAlerts === "boolean" ? candidate.resetAlerts : fallback.resetAlerts,
  };
}

function formatDuration(ms: number) {
  if (ms <= 0) return "Reset due now";
  const days = Math.floor(ms / ONE_DAY_MS);
  const hours = Math.floor((ms % ONE_DAY_MS) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return days > 0 ? `${days}d ${hours}h` : `${hours}h ${minutes}m`;
}

function formatTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
    timeZone: timezone,
    timeZoneName: "short",
  }).format(new Date(value));
}

function toLocalInputValue(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function persistReadings(readings: Reading[]) {
  window.localStorage.setItem(READINGS_KEY, JSON.stringify(readings));
}

function notifyOnce(key: string, title: string, body: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  let sent = new Set<string>();
  try {
    sent = new Set<string>(JSON.parse(window.localStorage.getItem(ALERTS_KEY) ?? "[]"));
  } catch {
    // Corrupt alert history is safe to replace.
  }
  if (sent.has(key)) return;
  new Notification(title, { body, tag: key });
  sent.add(key);
  window.localStorage.setItem(ALERTS_KEY, JSON.stringify([...sent].slice(-100)));
}

function downloadFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [credits, setCredits] = useState(0);
  const [weeklyRemaining, setWeeklyRemaining] = useState(0);
  const [resetAt, setResetAt] = useState("");
  const [readingResetAt, setReadingResetAt] = useState("");
  const [settings, setSettings] = useState<Settings>(() => defaultSettings());
  const [settingsDraft, setSettingsDraft] = useState<Settings>(() => defaultSettings());
  const [now, setNow] = useState(() => Date.now());
  const [editing, setEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [ready, setReady] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const defaults = defaultSettings();
    let storedSettings = defaults;
    try {
      storedSettings = normalizeSettings(JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? "{}"), defaults);
    } catch {
      // Invalid settings fall back to privacy-safe local defaults.
    }
    const savedReset = window.localStorage.getItem(RESET_KEY);
    const nextReset = savedReset ?? new Date(Date.now() + storedSettings.resetCadenceDays * ONE_DAY_MS).toISOString();
    let savedReadings: Reading[] = [];
    try {
      const parsed = JSON.parse(window.localStorage.getItem(READINGS_KEY) ?? "[]") as Reading[];
      if (Array.isArray(parsed)) savedReadings = parsed.slice(-storedSettings.retentionLimit);
    } catch {
      // Invalid history starts empty instead of blocking the dashboard.
    }

    // Local storage is the app's source of truth after client hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(storedSettings);
    setSettingsDraft(storedSettings);
    setResetAt(nextReset);
    setReadingResetAt(nextReset);
    setReadings(savedReadings);
    if (savedReadings.length) {
      const latest = savedReadings[savedReadings.length - 1];
      setCredits(latest.credits);
      setWeeklyRemaining(latest.weeklyRemaining);
    }
    window.localStorage.setItem(RESET_KEY, nextReset);
    setReady(true);
  }, []);

  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(clock);
  }, []);

  const latest = readings[readings.length - 1];
  const previous = readings[readings.length - 2];
  const creditDelta = previous && latest ? latest.credits - previous.credits : 0;
  const resetMs = resetAt ? new Date(resetAt).getTime() - now : 0;
  const low = Boolean(latest) && credits <= settings.lowCreditThreshold;
  const freshnessMs = latest ? now - new Date(latest.capturedAt).getTime() : Infinity;
  const freshness = !latest ? "No reading" : freshnessMs < 5 * 60_000 ? "Live" : freshnessMs < settings.staleAfterMinutes * 60_000 ? "Recent" : "Stale";

  useEffect(() => {
    if (!ready || !settings.alertsEnabled) return;
    if (settings.resetAlerts && resetAt && resetMs <= 0) {
      notifyOnce(`reset:${resetAt}`, "Usage Pulse reset due", "Your configured weekly reset time has passed. Check the official usage page.");
    }
    if (settings.staleAlerts && latest && freshness === "Stale") {
      notifyOnce(`stale:${latest.id}`, "Usage Pulse reading is stale", "Add a fresh reading before relying on the current balance.");
    }
  }, [freshness, latest, ready, resetAt, resetMs, settings]);

  const runway = useMemo(() => {
    const drops: number[] = [];
    for (let index = 1; index < readings.length; index += 1) {
      const used = readings[index - 1].credits - readings[index].credits;
      if (used > 0) drops.push(used);
    }
    if (!drops.length) return "Learning your pace";
    const average = drops.reduce((sum, value) => sum + value, 0) / drops.length;
    return `About ${Math.max(1, Math.floor(credits / average))} similar sessions`;
  }, [credits, readings]);

  function openNewReading() {
    setEditingId(null);
    setCredits(latest?.credits ?? 0);
    setWeeklyRemaining(latest?.weeklyRemaining ?? 0);
    setReadingResetAt(resetAt);
    setEditing(true);
  }

  function openEditReading(reading: Reading) {
    setEditingId(reading.id);
    setCredits(reading.credits);
    setWeeklyRemaining(reading.weeklyRemaining);
    setReadingResetAt(resetAt);
    setEditing(true);
    setHistoryOpen(false);
  }

  function saveReading() {
    const cleanCredits = Math.max(0, Math.round(credits));
    const cleanWeekly = Math.max(0, Math.min(100, Math.round(weeklyRemaining)));
    let nextReadings: Reading[];

    if (editingId) {
      nextReadings = readings.map((reading) => reading.id === editingId
        ? { ...reading, credits: cleanCredits, weeklyRemaining: cleanWeekly }
        : reading);
    } else {
      const next: Reading = {
        id: crypto.randomUUID(),
        credits: cleanCredits,
        weeklyRemaining: cleanWeekly,
        capturedAt: new Date().toISOString(),
        source: "manual",
      };
      nextReadings = [...readings, next].slice(-settings.retentionLimit);
      if (
        settings.alertsEnabled &&
        settings.lowCreditAlerts &&
        crossedThreshold(latest?.credits ?? cleanCredits, cleanCredits, settings.lowCreditThreshold)
      ) {
        notifyOnce(`low:${next.id}`, "Usage Pulse low-credit alert", `${cleanCredits} credits remain, at or below your ${settings.lowCreditThreshold}-credit threshold.`);
      }
    }

    const nextLatest = nextReadings[nextReadings.length - 1];
    setReadings(nextReadings);
    setCredits(nextLatest?.credits ?? 0);
    setWeeklyRemaining(nextLatest?.weeklyRemaining ?? 0);
    persistReadings(nextReadings);
    setResetAt(readingResetAt);
    window.localStorage.setItem(RESET_KEY, readingResetAt);
    setEditing(false);
    setEditingId(null);
    setNotice(editingId ? "Reading updated." : "Fresh reading saved.");
  }

  async function toggleAlerts() {
    if (!settings.alertsEnabled) {
      if (!("Notification" in window)) {
        setNotice("This browser does not support notifications.");
        return;
      }
      const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
      if (permission !== "granted") {
        setNotice("Notifications are blocked in your browser settings.");
        return;
      }
    }
    const next = { ...settings, alertsEnabled: !settings.alertsEnabled };
    setSettings(next);
    setSettingsDraft(next);
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    setNotice(next.alertsEnabled ? "Alerts are on." : "Alerts are off.");
  }

  function openSettings() {
    setSettingsDraft(settings);
    setSettingsOpen(true);
  }

  async function saveSettings() {
    if (!validTimezone(settingsDraft.timezone)) {
      setNotice("Enter a valid IANA timezone, such as America/Toronto.");
      return;
    }
    let alertsEnabled = settingsDraft.alertsEnabled;
    if (settingsDraft.alertsEnabled && "Notification" in window && Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") alertsEnabled = false;
    }
    const clean = normalizeSettings({ ...settingsDraft, alertsEnabled }, settings);
    const retained = readings.slice(-clean.retentionLimit);
    setSettings(clean);
    setSettingsDraft(clean);
    setReadings(retained);
    persistReadings(retained);
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(clean));
    setSettingsOpen(false);
    setNotice("Settings saved.");
  }

  function scheduleNextReset() {
    const cadence = settings.resetCadenceDays * ONE_DAY_MS;
    let next = resetAt ? new Date(resetAt).getTime() : Date.now();
    while (next <= Date.now()) next += cadence;
    const value = new Date(next).toISOString();
    setResetAt(value);
    window.localStorage.setItem(RESET_KEY, value);
    setNotice("Next reset scheduled.");
  }

  function deleteReading(id: string) {
    if (!window.confirm("Delete this reading? This cannot be undone.")) return;
    const next = readings.filter((reading) => reading.id !== id);
    setReadings(next);
    persistReadings(next);
    const nextLatest = next[next.length - 1];
    setCredits(nextLatest?.credits ?? 0);
    setWeeklyRemaining(nextLatest?.weeklyRemaining ?? 0);
    setNotice("Reading deleted.");
  }

  function clearHistory() {
    if (!window.confirm("Clear every saved reading? This cannot be undone.")) return;
    setReadings([]);
    setCredits(0);
    setWeeklyRemaining(0);
    persistReadings([]);
    setHistoryOpen(false);
    setNotice("All reading history cleared.");
  }

  function exportJson() {
    downloadFile("usage-pulse-export.json", JSON.stringify({ version: "1.6.0", exportedAt: new Date().toISOString(), resetAt, settings, readings }, null, 2), "application/json");
  }

  function exportCsv() {
    downloadFile("usage-pulse-readings.csv", readingsToCsv(readings), "text/csv;charset=utf-8");
  }

  async function importJson(file: File) {
    try {
      const imported = parseUsageImport(await file.text()) as { readings: Reading[]; settings?: Partial<Settings>; resetAt?: string };
      const nextSettings = normalizeSettings(imported.settings, settings);
      const nextReadings = imported.readings.slice(-nextSettings.retentionLimit);
      setSettings(nextSettings);
      setSettingsDraft(nextSettings);
      setReadings(nextReadings);
      persistReadings(nextReadings);
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(nextSettings));
      if (imported.resetAt && !Number.isNaN(Date.parse(imported.resetAt))) {
        setResetAt(imported.resetAt);
        window.localStorage.setItem(RESET_KEY, imported.resetAt);
      }
      const nextLatest = nextReadings[nextReadings.length - 1];
      setCredits(nextLatest?.credits ?? 0);
      setWeeklyRemaining(nextLatest?.weeklyRemaining ?? 0);
      setNotice(`${nextReadings.length} readings imported.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The import could not be read.");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  }

  if (!ready) return <main className="loading">Loading Usage Pulse…</main>;

  return (
    <main className="shell">
      <p className="srOnly" aria-live="polite">{notice}</p>
      <header className="topbar">
        <div className="brand"><span className="brandMark" aria-hidden="true">UP</span><div><strong>Usage Pulse</strong><span>Personal Codex monitor</span></div></div>
        <div className="topActions">
          <span className={`status ${freshness.toLowerCase().replace(" ", "-")}`}><i /> {freshness}</span>
          <button className="ghostButton" onClick={toggleAlerts}>{settings.alertsEnabled ? "Alerts on" : "Turn on alerts"}</button>
          <button className="ghostButton" onClick={openSettings}>Settings</button>
          <button className="primaryButton" onClick={openNewReading}>Sync reading</button>
        </div>
      </header>

      {notice && <div className="notice" role="status"><span>{notice}</span><button aria-label="Dismiss message" onClick={() => setNotice("")}>×</button></div>}

      <section className="hero">
        <div><p className="eyebrow">CREDIT CONTROL</p><h1>Know your runway.<br /><em>Before it runs out.</em></h1><p className="lede">A private, device-local view of your Codex allowance, credit balance, reset timing, and spending pace.</p></div>
        <aside className="privacyNote"><span aria-hidden="true">●</span><div><strong>Your data stays here</strong><p>No account password, payment details, or browsing history is stored.</p></div></aside>
      </section>

      <section className="dashboard" aria-label="Usage overview">
        <article className={`creditCard ${low ? "warning" : ""}`}>
          <div className="cardLabel"><span>Credits remaining</span><span className="signal">CURRENT</span></div>
          <div className="creditValue">{latest ? credits.toLocaleString() : "—"}</div>
          <div className="meter" aria-label={latest ? `${credits} credits remaining` : "No reading saved"}><span style={{ width: latest ? `${Math.min(100, credits / 10)}%` : "0%" }} /></div>
          <div className="cardFooter"><span>{!latest ? "Add your first reading" : low ? `At or below your ${settings.lowCreditThreshold}-credit threshold` : `${credits - settings.lowCreditThreshold} credits above your alert line`}</span><strong>{creditDelta === 0 ? "No change" : `${creditDelta > 0 ? "+" : ""}${creditDelta}`}</strong></div>
        </article>

        <article className="metricCard darkCard">
          <div className="cardLabel"><span>Weekly allowance</span><span>INCLUDED</span></div>
          <div className="metricValue">{latest ? weeklyRemaining : "—"}{latest && <small>%</small>}</div>
          <div className="ring" style={{ "--value": `${weeklyRemaining * 3.6}deg` } as React.CSSProperties}><span>{latest ? `${weeklyRemaining}%` : "—"}</span></div>
          <p>{!latest ? "Waiting for first reading" : weeklyRemaining === 0 ? "Using credits until reset" : "Included usage available"}</p>
        </article>

        <article className="metricCard resetCard">
          <div className="cardLabel"><span>Next reset</span><span>{settings.timezone}</span></div>
          <div className="metricValue resetValue">{formatDuration(resetMs)}</div>
          <p>{resetAt ? formatTime(resetAt, settings.timezone) : "Set your reset time"}</p>
          <div className="timeline"><span /><i /></div>
          <div className="cardFooter"><span>Every {settings.resetCadenceDays} days</span><button className="textButton" onClick={scheduleNextReset}>{resetMs <= 0 ? "Schedule next" : "Advance reset"}</button></div>
        </article>
      </section>

      <section className="lowerGrid">
        <article className="panel runwayPanel">
          <div className="panelHeader"><div><p className="eyebrow">PACE</p><h2>Credit runway</h2></div><span className="quietPill">Last {settings.retentionLimit} readings</span></div>
          <div className="runwayNumber">{runway}</div>
          <div className="barChart" aria-label="Saved credit readings">{(readings.length ? readings.slice(-12) : [undefined, undefined, undefined, undefined, undefined, undefined]).map((reading, index) => <div key={reading?.id ?? index} className="barColumn"><span style={{ height: reading ? `${Math.max(10, Math.min(100, reading.credits / 10))}%` : "10%" }} /></div>)}</div>
          <div className="chartCaption"><span>Older</span><span>Now</span></div>
        </article>

        <article className="panel activityPanel">
          <div className="panelHeader"><div><p className="eyebrow">HISTORY</p><h2>Recent readings</h2></div><button className="textButton" onClick={() => setHistoryOpen(true)}>Manage</button></div>
          <div className="activityList">
            {!readings.length && <p className="emptyState">No readings yet. Add your first official usage snapshot.</p>}
            {readings.slice(-4).reverse().map((reading, index) => <div className="activityRow" key={reading.id}><span className={index === 0 ? "activeDot" : "historyDot"} /><div><strong>{reading.credits} credits</strong><small>{reading.weeklyRemaining}% weekly remaining</small></div><time>{formatTime(reading.capturedAt, settings.timezone)}</time></div>)}
          </div>
          <button className="fullButton" onClick={openNewReading}>Add a fresh reading</button>
        </article>
      </section>

      <section className="connectionStrip"><div><span className="connectionIcon">↻</span><div><strong>Local live mode</strong><p>Countdowns and alerts update continuously. Balance sync is manual because personal Codex credits do not have a documented public feed.</p></div></div><a href="https://chatgpt.com/codex/settings/usage" target="_blank" rel="noreferrer">Open official usage page ↗</a></section>

      {editing && <div className="modalBackdrop"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="sync-title">
        <div className="modalHeader"><div><p className="eyebrow">{editingId ? "EDIT SNAPSHOT" : "NEW SNAPSHOT"}</p><h2 id="sync-title">{editingId ? "Correct saved reading" : "Sync current usage"}</h2></div><button aria-label="Close" onClick={() => setEditing(false)}>×</button></div>
        <label>Credits remaining<input type="number" min="0" value={credits} onChange={(event) => setCredits(Number(event.target.value))} /></label>
        <label>Weekly allowance remaining<input type="number" min="0" max="100" value={weeklyRemaining} onChange={(event) => setWeeklyRemaining(Number(event.target.value))} /><span>%</span></label>
        <label>Next weekly reset<input type="datetime-local" value={readingResetAt ? toLocalInputValue(readingResetAt) : ""} onChange={(event) => setReadingResetAt(event.target.value ? new Date(event.target.value).toISOString() : "")} /></label>
        <p className="modalHelp">Read these values from the official Codex usage page. This tracker stores the snapshot only in this browser.</p>
        <div className="modalActions"><button className="ghostButton" onClick={() => setEditing(false)}>Cancel</button><button className="primaryButton" onClick={saveReading}>{editingId ? "Update reading" : "Save reading"}</button></div>
      </div></div>}

      {settingsOpen && <div className="modalBackdrop"><div className="modal wideModal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="modalHeader"><div><p className="eyebrow">PREFERENCES</p><h2 id="settings-title">Usage controls</h2></div><button aria-label="Close" onClick={() => setSettingsOpen(false)}>×</button></div>
        <div className="settingsGrid">
          <label>Low-credit threshold<input type="number" min="0" value={settingsDraft.lowCreditThreshold} onChange={(event) => setSettingsDraft({ ...settingsDraft, lowCreditThreshold: Number(event.target.value) })} /></label>
          <label>History retention<input type="number" min="5" max="100" value={settingsDraft.retentionLimit} onChange={(event) => setSettingsDraft({ ...settingsDraft, retentionLimit: Number(event.target.value) })} /><span>readings</span></label>
          <label>Reset cadence<input type="number" min="1" max="365" value={settingsDraft.resetCadenceDays} onChange={(event) => setSettingsDraft({ ...settingsDraft, resetCadenceDays: Number(event.target.value) })} /><span>days</span></label>
          <label>Stale after<input type="number" min="5" value={settingsDraft.staleAfterMinutes} onChange={(event) => setSettingsDraft({ ...settingsDraft, staleAfterMinutes: Number(event.target.value) })} /><span>minutes</span></label>
        </div>
        <label>Display timezone<input type="text" list="timezones" value={settingsDraft.timezone} onChange={(event) => setSettingsDraft({ ...settingsDraft, timezone: event.target.value })} /></label>
        <datalist id="timezones"><option value="America/Toronto" /><option value="America/New_York" /><option value="America/Los_Angeles" /><option value="Europe/London" /><option value="Asia/Shanghai" /><option value="UTC" /></datalist>
        <fieldset className="alertOptions"><legend>Notification preferences</legend>
          <label><input type="checkbox" checked={settingsDraft.alertsEnabled} onChange={(event) => setSettingsDraft({ ...settingsDraft, alertsEnabled: event.target.checked })} /> Enable browser alerts</label>
          <label><input type="checkbox" checked={settingsDraft.lowCreditAlerts} onChange={(event) => setSettingsDraft({ ...settingsDraft, lowCreditAlerts: event.target.checked })} /> Low-credit crossings</label>
          <label><input type="checkbox" checked={settingsDraft.staleAlerts} onChange={(event) => setSettingsDraft({ ...settingsDraft, staleAlerts: event.target.checked })} /> Stale readings</label>
          <label><input type="checkbox" checked={settingsDraft.resetAlerts} onChange={(event) => setSettingsDraft({ ...settingsDraft, resetAlerts: event.target.checked })} /> Reset due</label>
        </fieldset>
        <div className="modalActions"><button className="ghostButton" onClick={() => setSettingsOpen(false)}>Cancel</button><button className="primaryButton" onClick={saveSettings}>Save settings</button></div>
      </div></div>}

      {historyOpen && <div className="modalBackdrop"><div className="modal historyModal" role="dialog" aria-modal="true" aria-labelledby="history-title">
        <div className="modalHeader"><div><p className="eyebrow">LOCAL DATA</p><h2 id="history-title">Manage history</h2></div><button aria-label="Close" onClick={() => setHistoryOpen(false)}>×</button></div>
        <div className="historyActions"><button className="ghostButton" onClick={exportJson} disabled={!readings.length}>Export JSON</button><button className="ghostButton" onClick={exportCsv} disabled={!readings.length}>Export CSV</button><button className="ghostButton" onClick={() => importRef.current?.click()}>Import JSON</button><input ref={importRef} className="fileInput" type="file" accept="application/json,.json" onChange={(event) => event.target.files?.[0] && importJson(event.target.files[0])} /></div>
        <div className="historyRows">{!readings.length && <p className="emptyState">No local readings to manage.</p>}{readings.slice().reverse().map((reading) => <div className="historyItem" key={reading.id}><div><strong>{reading.credits} credits · {reading.weeklyRemaining}% weekly</strong><small>{formatTime(reading.capturedAt, settings.timezone)}</small></div><div><button className="textButton" onClick={() => openEditReading(reading)}>Edit</button><button className="dangerButton" onClick={() => deleteReading(reading.id)}>Delete</button></div></div>)}</div>
        <div className="modalActions splitActions"><button className="dangerButton" onClick={clearHistory} disabled={!readings.length}>Clear all history</button><button className="primaryButton" onClick={() => setHistoryOpen(false)}>Done</button></div>
      </div></div>}
    </main>
  );
}
