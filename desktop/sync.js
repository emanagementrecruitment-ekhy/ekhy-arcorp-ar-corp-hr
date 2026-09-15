// Replays the mutating /api/** calls captured while running in local/offline
// mode (see server-wrapper.js) against the live Railway app, once the office
// is back online and someone has logged in there. Deliberately NOT a generic
// two-way sync — see the "Recommended" answer this was scoped to: it only
// ever pushes forward what was created locally, one call at a time, and
// never fabricates or reconciles conflicting edits.
//
// ID chaining: a record created locally gets a different id when the same
// create is replayed against Railway (both sides use Prisma's own
// auto-generated cuid, and the local one obviously can't be forced onto
// Railway's database). So after each successful replay we diff the local
// call's own recorded response against the fresh remote response to learn
// "this local id now means this remote id", and rewrite that id (a plain,
// safe whole-string substitution — cuids are long/random enough that this
// never collides with unrelated text) into every later call's URL and body
// before sending it. This makes ordinary create-then-reference-it flows
// (e.g. a Kasbon created offline, later referenced by its own id) replay
// correctly; anything else is sent through unchanged.
const fs = require("fs");
const https = require("https");
const http = require("http");
const { URL } = require("url");

// Matches Prisma's default cuid() shape closely enough to safely treat as an
// id token for substitution purposes (25 lowercase-alnum chars starting with
// "c") without accidentally rewriting ordinary text.
const ID_TOKEN = /\bc[a-z0-9]{24}\b/g;

function collectIds(value, out) {
  if (value == null) return;
  if (typeof value === "string") {
    const matches = value.match(ID_TOKEN);
    if (matches) for (const m of matches) out.add(m);
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectIds(v, out);
    return;
  }
  if (typeof value === "object") {
    for (const v of Object.values(value)) collectIds(v, out);
  }
}

function extractIdsInOrder(jsonText) {
  const ids = new Set();
  try {
    collectIds(JSON.parse(jsonText), ids);
  } catch {
    // not JSON (e.g. empty body) — nothing to extract
  }
  return Array.from(ids);
}

function applyIdMap(text, idMap) {
  if (!text) return text;
  let out = text;
  for (const [localId, remoteId] of Object.entries(idMap)) {
    if (localId === remoteId) continue;
    out = out.split(localId).join(remoteId);
  }
  return out;
}

function request(urlString, { method, headers, body }) {
  return new Promise((resolve, reject) => {
    const target = new URL(urlString);
    const lib = target.protocol === "https:" ? https : http;
    const req = lib.request(
      target,
      { method, headers },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf8") }));
      }
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function readPending(pendingSyncPath) {
  if (!fs.existsSync(pendingSyncPath)) return [];
  const text = fs.readFileSync(pendingSyncPath, "utf8");
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function writePending(pendingSyncPath, entries) {
  fs.writeFileSync(pendingSyncPath, entries.map((e) => JSON.stringify(e)).join("\n") + (entries.length ? "\n" : ""));
}

/**
 * @param {object} opts
 * @param {string} opts.pendingSyncPath
 * @param {string} opts.railwayUrl
 * @param {string} opts.cookie - a valid "arcorp_session=..." cookie for Railway
 */
async function runSync({ pendingSyncPath, railwayUrl, cookie }) {
  const entries = readPending(pendingSyncPath);
  if (entries.length === 0) {
    return { sent: 0, failed: 0, remaining: 0, failedDetails: [] };
  }

  const idMap = {};
  const failed = [];
  let sent = 0;

  for (const entry of entries) {
    const rewrittenUrl = applyIdMap(entry.url, idMap);
    const rewrittenBody = applyIdMap(entry.requestBody, idMap);

    let result;
    try {
      result = await request(railwayUrl + rewrittenUrl, {
        method: entry.method,
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
          "Content-Length": Buffer.byteLength(rewrittenBody || ""),
        },
        body: rewrittenBody || undefined,
      });
    } catch (e) {
      failed.push({ entry, error: e.message });
      continue;
    }

    if (result.status < 200 || result.status >= 300) {
      failed.push({ entry, error: `HTTP ${result.status}: ${result.body.slice(0, 300)}` });
      continue;
    }

    // Learn local-id -> remote-id mappings from this call's own before/after
    // response, so any LATER entry referencing the same local id gets
    // rewritten to the id Railway actually assigned.
    const localIds = extractIdsInOrder(entry.responseBody);
    const remoteIds = extractIdsInOrder(result.body);
    for (let i = 0; i < Math.min(localIds.length, remoteIds.length); i++) {
      idMap[localIds[i]] = remoteIds[i];
    }

    sent += 1;
  }

  // Only the failed ones stay queued — everything sent successfully is done.
  writePending(pendingSyncPath, failed.map((f) => f.entry));

  return {
    sent,
    failed: failed.length,
    remaining: failed.length,
    failedDetails: failed.map((f) => ({ method: f.entry.method, url: f.entry.url, error: f.error })),
  };
}

module.exports = { runSync };
