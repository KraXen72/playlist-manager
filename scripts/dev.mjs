import esbuild from "esbuild"
import electronPath from "electron"
import { spawn } from "node:child_process"
import { builtinModules } from "node:module"
import { watch } from "node:fs"
import { readdir } from "node:fs/promises"
import path from "node:path"

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

const baseBuildConfig = {
  bundle: true,
  external,
  platform: "node",
  format: "esm",
  target: "es2022",
  logLevel: "info",
  sourcemap: "inline",
  treeShaking: true,
  outExtension: { ".js": ".mjs" },
  outdir: "dist"
}

let watchModeStarted = false
const skipNextSuccess = new Set(["main", "preload"])
const pendingChanges = { main: false, preload: false, renderer: false }
const staticWatchers = []
let actionTimer
let shuttingDown = false
let restarting = false
let electronProcess = null

const scheduleAction = (kind) => {
  pendingChanges[kind] = true
  if (actionTimer) return

  actionTimer = setTimeout(async () => {
    actionTimer = undefined

    const needsRestart = pendingChanges.main
    const needsReload = !pendingChanges.main && (pendingChanges.preload || pendingChanges.renderer)
    pendingChanges.main = false
    pendingChanges.preload = false
    pendingChanges.renderer = false

    if (needsRestart) {
      await restartElectron("main graph updated")
      return
    }

    if (needsReload) {
      reloadRenderer("preload graph updated")
    }
  }, 100)
}

const createBuildContext = (kind, entryPoint) => {
  return esbuild.context({
    ...baseBuildConfig,
    entryPoints: [entryPoint],
    plugins: [{
      name: `dev-${kind}-watch`,
      setup(build) {
        build.onEnd((result) => {
          if (result.errors.length > 0) return
          if (!watchModeStarted) return
          if (skipNextSuccess.has(kind)) {
            skipNextSuccess.delete(kind)
            return
          }
          scheduleAction(kind)
        })
      }
    }]
  })
}

const spawnElectron = () => {
  electronProcess = spawn(electronPath, ["."], {
    stdio: ["inherit", "inherit", "inherit", "ipc"],
    env: {
      ...process.env,
      NODE_OPTIONS: "--experimental-sqlite"
    }
  })

  electronProcess.on("exit", (code, signal) => {
    if (shuttingDown || restarting) return
    console.log(`[dev] Electron exited (code=${code ?? "null"}, signal=${signal ?? "null"})`)
  })
}

const stopElectron = async () => {
  if (!electronProcess || electronProcess.killed) return
  const child = electronProcess
  await new Promise((resolve) => {
    child.once("exit", resolve)
    child.kill("SIGTERM")
  })
}

const restartElectron = async (reason) => {
  if (restarting) {
    pendingChanges.main = true
    return
  }

  restarting = true
  console.log(`[dev] Restarting Electron (${reason})`)
  await stopElectron()
  if (!shuttingDown) spawnElectron()
  restarting = false

  if (pendingChanges.main) {
    pendingChanges.main = false
    await restartElectron("queued main graph update")
    return
  }

  if (pendingChanges.preload || pendingChanges.renderer) {
    pendingChanges.preload = false
    pendingChanges.renderer = false
    reloadRenderer("queued preload graph update")
  }
}

const reloadRenderer = (reason) => {
  if (!electronProcess || !electronProcess.connected) return
  console.log(`[dev] Reloading renderer (${reason})`)
  electronProcess.send({ type: "renderer-reload" })
}

const watchRendererAssets = async (rootDir) => {
  const directories = [rootDir]

  while (directories.length > 0) {
    const currentDir = directories.pop()
    const entries = await readdir(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.isDirectory()) directories.push(path.join(currentDir, entry.name))
    }

    const watcher = watch(currentDir, (eventType, filename) => {
      if (!filename) return
      if (eventType !== "change" && eventType !== "rename") return

      const extension = path.extname(String(filename)).toLowerCase()
      if (extension !== ".html" && extension !== ".css") return
      scheduleAction("renderer")
    })

    staticWatchers.push(watcher)
  }
}

const shutdown = async () => {
  if (shuttingDown) return
  shuttingDown = true

  if (actionTimer) {
    clearTimeout(actionTimer)
    actionTimer = undefined
  }

  for (const watcher of staticWatchers) watcher.close()
  await Promise.allSettled([mainContext.dispose(), preloadContext.dispose()])
  await stopElectron()
  process.exit(0)
}

const mainContext = await createBuildContext("main", "src/main.ts")
const preloadContext = await createBuildContext("preload", "src/preload.ts")

await Promise.all([mainContext.rebuild(), preloadContext.rebuild()])
watchModeStarted = true
await Promise.all([mainContext.watch(), preloadContext.watch()])
await watchRendererAssets(path.join(process.cwd(), "src"))
spawnElectron()

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
