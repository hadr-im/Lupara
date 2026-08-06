// Assembles Vercel Build Output API (v3) from the portable Vite build.
//   dist/client/          -> .vercel/output/static/        (served by filesystem)
//   dist/server/server.js -> .vercel/output/functions/render.func/ (Node function)
// Run after `vite build`.
import { build } from "esbuild";
import { cp, mkdir, writeFile, rm } from "node:fs/promises";

const OUT = ".vercel/output";
const FUNC = `${OUT}/functions/render.func`;

await rm(OUT, { recursive: true, force: true });
await mkdir(FUNC, { recursive: true });

// 1. Bundle the Node adapter + the built server handler into a self-contained function.
await build({
  entryPoints: { index: "deploy/entry.vercel.mjs" },
  outdir: FUNC,
  outExtension: { ".js": ".mjs" },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  // Node built-ins stay external (platform:node); npm deps are inlined.
  banner: {
    js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);",
  },
});

// 2. Function config — Node runtime, streaming responses.
await writeFile(
  `${FUNC}/.vc-config.json`,
  JSON.stringify(
    {
      runtime: "nodejs20.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      shouldAddHelpers: false,
      supportsResponseStreaming: true,
    },
    null,
    2,
  ),
);

// 3. Static client assets.
await cp("dist/client", `${OUT}/static`, { recursive: true });

// 4. Routing: serve static files first, then everything falls through to the app.
await writeFile(
  `${OUT}/config.json`,
  JSON.stringify(
    {
      version: 3,
      routes: [{ handle: "filesystem" }, { src: "/(.*)", dest: "/render" }],
    },
    null,
    2,
  ),
);

console.log("✓ Built .vercel/output (static + render function)");
