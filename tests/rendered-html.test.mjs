import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { crossedThreshold, parseUsageImport, readingsToCsv } from "../app/usage-data.mjs";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Usage Pulse shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Usage Pulse — Personal Codex Monitor<\/title>/i);
  assert.match(html, /Loading Usage Pulse/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton|codex-preview/i);
});

test("public source contains no private hosting metadata or credentials", async () => {
  await assert.rejects(access(new URL("../.openai/hosting.json", import.meta.url)));
  const [page, readme, prd] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("../PRD.md", import.meta.url), "utf8"),
  ]);
  const publicText = `${page}\n${readme}\n${prd}`;
  assert.doesNotMatch(publicText, /appgprj_|art_v1_|cs_live_|FF1E-|DCC9-|8844-/i);
});

test("detects only a new low-credit threshold crossing", () => {
  assert.equal(crossedThreshold(200, 125, 125), true);
  assert.equal(crossedThreshold(125, 100, 125), false);
  assert.equal(crossedThreshold(200, 150, 125), false);
});

test("validates portable Usage Pulse imports", () => {
  const payload = parseUsageImport(JSON.stringify({ readings: [{
    id: "reading-1",
    credits: 450.4,
    weeklyRemaining: 75,
    capturedAt: "2026-08-08T12:00:00.000Z",
    source: "manual",
  }] }));
  assert.equal(payload.readings[0].credits, 450);
  assert.throws(() => parseUsageImport('{"readings":[{"id":"bad","credits":-1}]}'), /invalid reading/i);
});

test("exports spreadsheet-friendly CSV with escaped fields", () => {
  const csv = readingsToCsv([{ id: 'one,"two', credits: 10, weeklyRemaining: 20, capturedAt: "2026-08-08T12:00:00.000Z", source: "manual" }]);
  assert.match(csv, /^id,credits,weeklyRemaining,capturedAt,source/);
  assert.match(csv, /"one,""two"/);
});
