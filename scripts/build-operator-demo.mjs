import { build } from "esbuild";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const result = await build({
  entryPoints: [path.join(root, "ui/src/features/operator-workspace/Demo.tsx")],
  bundle: true,
  write: false,
  outfile: "operator.js",
  format: "iife",
  jsx: "automatic",
  minify: true,
  define: { "process.env.NODE_ENV": '"production"' },
  target: "es2022",
  legalComments: "none",
});
const js = result.outputFiles
  .find((file) => file.path.endsWith(".js"))
  .text.replaceAll("</script", "<\\/script");
const css = result.outputFiles.find((file) => file.path.endsWith(".css")).text;
const favicon = await readFile(
  path.join(root, "ui/public/favicon.svg"),
  "utf8",
);
const out = path.join(root, "ui/dist-operator");
await mkdir(out, { recursive: true });
for (const [file, direction] of [
  ["Paperclip-Workspace-10x-Winner", "winner"],
  ["Paperclip-Workspace-V-A-Optimizer", "optimizer"],
  ["Paperclip-Workspace-V-B-Reimaginer", "reimaginer"],
  ["Paperclip-Workspace-V-C-Converter", "converter"],
]) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Independent Paperclip operator workspace by Megan (@megandmartin). Interactive preview with sample data."><link rel="icon" href="data:image/svg+xml,${encodeURIComponent(favicon)}"><title>Paperclip 10x · Operator workspace</title><style>${css}</style></head><body><div id="root"></div><script>window.__OPERATOR_DIRECTION__=${JSON.stringify(direction)};${js}</script></body></html>`;
  await writeFile(path.join(out, `${file}.html`), html);
  console.log(
    `Built ${file}.html (${Math.round(Buffer.byteLength(html) / 1024)} KB)`,
  );
}
