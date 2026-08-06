// Local simulation of Vercel's Build Output routing, to verify the function
// bundle runs under Node exactly as it will on Vercel:
//   - static files served from .vercel/output/static (the "filesystem" handle)
//   - everything else -> the _render function
// NOT for production — Vercel serves the same .vercel/output itself.
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";

// Load .env into process.env
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const handler = (await import("../.vercel/output/functions/render.func/index.mjs")).default;
const STATIC = normalize(".vercel/output/static");
const MIME = {
  ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".html": "text/html", ".json": "application/json", ".svg": "image/svg+xml",
  ".ico": "image/x-icon", ".png": "image/png", ".webp": "image/webp",
  ".woff2": "font/woff2", ".txt": "text/plain",
};

const server = http.createServer(async (req, res) => {
  const path = decodeURIComponent(req.url.split("?")[0]);
  const filePath = normalize(join(STATIC, path));
  if (filePath.startsWith(STATIC + sep)) {
    try {
      if ((await stat(filePath)).isFile()) {
        res.setHeader("content-type", MIME[extname(filePath)] || "application/octet-stream");
        res.end(await readFile(filePath));
        return;
      }
    } catch { /* not a static file -> fall through to app */ }
  }
  handler(req, res);
});

server.listen(3100, () => console.log("vercel-sim listening on http://localhost:3100"));
