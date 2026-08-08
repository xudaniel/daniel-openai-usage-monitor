"use client";

import { useEffect, useMemo, useState } from "react";

type Reading = {
  id: string;
  credits: number;
  weeklyRemaining: number;
  capturedAt: string;
  source: "manual" | "local";
};

const LOW_THRESHOLD = 125;
const RESET_STORAGE_KEY = "usage-pulse-reset-at";
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function formatDuration(ms: number) {
  if (ms <= 0) return "Reset due now";
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m`;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function toLocalInputValue(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function Home() {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [credits, setCredits] = useState(0);
  const [weeklyRemaining, setWeeklyRemaining] = useState(0);
  const [resetAt, setResetAt] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [editing, setEditing] = useState(false);
  const [alertsOn, setAlertsOn] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("usage-pulse-readings");
    const alerts = window.localStorage.getItem("usage-pulse-alerts") === "on";
    const savedReset = window.localStorage.getItem(RESET_STORAGE_KEY);
    const nextReset = savedReset ?? new Date(Date.now() + ONE_WEEK_MS).toISOString();
    // Local storage is the app's source of truth after client hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResetAt(nextReset);
    if (!savedReset) window.localStorage.setItem(RESET_STORAGE_KEY, nextReset);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Reading[];
        if (parsed.length) {
          setReadings(parsed);
          setCredits(parsed[parsed.length - 1].credits);
          setWeeklyRemaining(parsed[parsed.length - 1].weeklyRemaining);
        }
      } catch {
        // A corrupt local snapshot should never prevent the dashboard loading.
      }
    } else {
      const initial: Reading = {
        id: crypto.randomUUID(),
        credits: 0,
        weeklyRemaining: 0,
        capturedAt: new Date().toISOString(),
        source: "local",
      };
      setReadings([initial]);
      window.localStorage.setItem("usage-pulse-readings", JSON.stringify([initial]));
    }
    setAlertsOn(alerts);
    setReady(true);
  }, []);

  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(clock);
  }, []);

  const latest = readings[readings.length - 1];
  const previous = readings[readings.length - 2];
  const creditDelta = previous ? latest.credits - previous.credits : 0;
  const resetMs = resetAt ? new Date(resetAt).getTime() - now : 0;
  const low = credits <= LOW_THRESHOLD;
  const freshnessMs = latest ? now - new Date(latest.capturedAt).getTime() : Infinity;
  const freshness = freshnessMs < 5 * 60_000 ? "Live" : freshnessMs < 60 * 60_000 ? "Recent" : "Stale";

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

  function saveReading() {
    const next: Reading = {
      id: crypto.randomUUID(),
      credits: Math.max(0, Math.round(credits)),
      weeklyRemaining: Math.max(0, Math.min(100, weeklyRemaining)),
      capturedAt: new Date().toISOString(),
      source: "manual",
    };
    const nextReadings = [...readings, next].slice(-30);
    setReadings(nextReadings);
    window.localStorage.setItem("usage-pulse-readings", JSON.stringify(nextReadings));
    window.localStorage.setItem(RESET_STORAGE_KEY, resetAt);
    setEditing(false);
  }

  async function toggleAlerts() {
    if (!alertsOn && "Notification" in window && Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
    }
    const next = !alertsOn;
    setAlertsOn(next);
    window.localStorage.setItem("usage-pulse-alerts", next ? "on" : "off");
  }

  if (!ready) return <main className="loading">Loading Usage Pulse…</main>;

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brandMark" aria-hidden="true">UP</span>
          <div>
            <strong>Usage Pulse</strong>
            <span>Personal Codex monitor</span>
          </div>
        </div>
        <div className="topActions">
          <span className={`status ${freshness.toLowerCase()}`}><i /> {freshness} reading</span>
          <button className="ghostButton" onClick={toggleAlerts}>{alertsOn ? "Alerts on" : "Turn on alerts"}</button>
          <button className="primaryButton" onClick={() => setEditing(true)}>Sync reading</button>
        </div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">CREDIT CONTROL</p>
          <h1>Know your runway.<br /><em>Before it runs out.</em></h1>
          <p className="lede">A private, device-local view of your Codex allowance, credit balance, reset timing, and spending pace.</p>
        </div>
        <aside className="privacyNote">
          <span aria-hidden="true">●</span>
          <div><strong>Your data stays here</strong><p>No account password, payment details, or browsing history is stored.</p></div>
        </aside>
      </section>

      <section className="dashboard" aria-label="Usage overview">
        <article className={`creditCard ${low ? "warning" : ""}`}>
          <div className="cardLabel"><span>Credits remaining</span><span className="signal">CURRENT</span></div>
          <div className="creditValue">{credits.toLocaleString()}</div>
          <div className="meter" aria-label={`${credits} credits remaining`}><span style={{ width: `${Math.min(100, credits / 10)}%` }} /></div>
          <div className="cardFooter"><span>{low ? "Low balance threshold reached" : `${credits - LOW_THRESHOLD} credits above your alert line`}</span><strong>{creditDelta === 0 ? "No change" : `${creditDelta > 0 ? "+" : ""}${creditDelta}`}</strong></div>
        </article>

        <article className="metricCard darkCard">
          <div className="cardLabel"><span>Weekly allowance</span><span>INCLUDED</span></div>
          <div className="metricValue">{weeklyRemaining}<small>%</small></div>
          <div className="ring" style={{ "--value": `${weeklyRemaining * 3.6}deg` } as React.CSSProperties}><span>{weeklyRemaining}%</span></div>
          <p>{weeklyRemaining === 0 ? "Using credits until reset" : "Included usage available"}</p>
        </article>

        <article className="metricCard resetCard">
          <div className="cardLabel"><span>Next reset</span><span>LOCAL TIME</span></div>
          <div className="metricValue resetValue">{formatDuration(resetMs)}</div>
          <p>{resetAt ? formatTime(resetAt) : "Set your reset time"}</p>
          <div className="timeline"><span /><i /></div>
          <div className="cardFooter"><span>Weekly allowance refresh</span><strong>{resetMs <= 0 ? "Check now" : "Scheduled"}</strong></div>
        </article>
      </section>

      <section className="lowerGrid">
        <article className="panel runwayPanel">
          <div className="panelHeader"><div><p className="eyebrow">PACE</p><h2>Credit runway</h2></div><span className="quietPill">Last 30 readings</span></div>
          <div className="runwayNumber">{runway}</div>
          <div className="barChart" aria-label="Saved credit readings">
            {(readings.length > 1 ? readings.slice(-12) : [latest, latest, latest, latest, latest, latest]).map((reading, index) => (
              <div key={`${reading?.id}-${index}`} className="barColumn">
                <span style={{ height: `${Math.max(10, Math.min(100, (reading?.credits ?? credits) / 10))}%` }} />
              </div>
            ))}
          </div>
          <div className="chartCaption"><span>Older</span><span>Now</span></div>
        </article>

        <article className="panel activityPanel">
          <div className="panelHeader"><div><p className="eyebrow">HISTORY</p><h2>Recent readings</h2></div></div>
          <div className="activityList">
            {readings.slice(-4).reverse().map((reading, index) => (
              <div className="activityRow" key={reading.id}>
                <span className={index === 0 ? "activeDot" : "historyDot"} />
                <div><strong>{reading.credits} credits</strong><small>{reading.weeklyRemaining}% weekly remaining</small></div>
                <time>{formatTime(reading.capturedAt)}</time>
              </div>
            ))}
          </div>
          <button className="fullButton" onClick={() => setEditing(true)}>Add a fresh reading</button>
        </article>
      </section>

      <section className="connectionStrip">
        <div><span className="connectionIcon">↻</span><div><strong>Local live mode</strong><p>Countdowns and alerts update continuously. Balance sync is manual because personal Codex credits do not have a documented public feed.</p></div></div>
        <a href="https://chatgpt.com/codex/settings/usage" target="_blank" rel="noreferrer">Open official usage page ↗</a>
      </section>

      {editing && (
        <div className="modalBackdrop">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="sync-title">
            <div className="modalHeader"><div><p className="eyebrow">NEW SNAPSHOT</p><h2 id="sync-title">Sync current usage</h2></div><button aria-label="Close" onClick={() => setEditing(false)}>×</button></div>
            <label>Credits remaining<input type="number" min="0" value={credits} onChange={(event) => setCredits(Number(event.target.value))} /></label>
            <label>Weekly allowance remaining<input type="number" min="0" max="100" value={weeklyRemaining} onChange={(event) => setWeeklyRemaining(Number(event.target.value))} /><span>%</span></label>
            <label>Next weekly reset<input type="datetime-local" value={resetAt ? toLocalInputValue(resetAt) : ""} onChange={(event) => setResetAt(event.target.value ? new Date(event.target.value).toISOString() : "")} /></label>
            <p className="modalHelp">Read these two numbers from the official Codex usage page. This tracker stores the snapshot only in this browser.</p>
            <div className="modalActions"><button className="ghostButton" onClick={() => setEditing(false)}>Cancel</button><button className="primaryButton" onClick={saveReading}>Save reading</button></div>
          </div>
        </div>
      )}
    </main>
  );
}
