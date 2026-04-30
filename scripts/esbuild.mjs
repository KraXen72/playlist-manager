import esbuild from "esbuild"
import process from "node:process"
import { builtinModules } from "node:module"

const prod = process.argv[2] === "production"
const builtinExternal = [...builtinModules, ...builtinModules.map(m => `node:${m}`)]
const external = [
  "electron",
  "@electron/remote",
  "@electron/remote/main",
  "@trevoreyre/autocomplete-js",
  "fs-walk",
  "music-metadata",
  "smooth-dnd",
  ...builtinExternal
]

const buildConfig = {
  entryPoints: {
    main: "src/main.ts",
    preload: "src/preload.ts"
  },
  bundle: true,
  external,
  platform: "node",
  format: "esm",
  target: "es2022",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outExtension: { ".js": ".mjs" },
  outdir: "dist"
}

if (prod) {
  const context = await esbuild.context(buildConfig)
  await context.rebuild()
  await context.dispose()
  process.exit(0)
}

const context = await esbuild.context(buildConfig)
await context.watch()
