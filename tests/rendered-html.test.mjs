import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

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
