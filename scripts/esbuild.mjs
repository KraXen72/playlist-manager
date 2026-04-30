import esbuild from "esbuild"
import electronPath from "electron"
import { spawn } from "node:child_process"
import chokidar from "chokidar"
import { builtinModules } from "node:module"
import process from "node:process"

const mode = process.argv[2] ?? "watch"
if (!["production", "watch", "dev"].includes(mode)) {
  console.error(`Unknown mode "${mode}". Use: production | watch | dev`)
  process.exit(1)
}

const builtinExternal = [...builtinModules, ...builtinModules.map((moduleName) => `node:${moduleName}`)]
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

const baseBuildOptions = {
  bundle: true,
  external,
  platform: "node",
  format: "esm",
  target: "es2022",
  logLevel: "info",
  treeShaking: true,
  outExtension: { ".js": ".mjs" },
  outdir: "dist"
}

const createCombinedBuildOptions = (sourcemap) => ({
  ...baseBuildOptions,
  entryPoints: {
    main: "src/main.ts",
    preload: "src/preload.ts"
  },
  sourcemap
})

const createSingleEntryBuildOptions = (entryPoint, sourcemap) => ({
  ...baseBuildOptions,
  entryPoints: [entryPoint],
  sourcemap
})

const runProductionBuild = async () => {
  const context = await esbuild.context(createCombinedBuildOptions(false))
  await context.rebuild()
  await context.dispose()
}

const runBuildWatch = async () => {
  const context = await esbuild.context(createCombinedBuildOptions("inline"))
  await context.watch()
}

const runDevSupervisor = async () => {
  const pendingChanges = { main: false, renderer: false }
  const initialBuildDone = { main: false, preload: false }
  let actionTimer
  let shuttingDown = false
  let restarting = false
  let electronStarted = false
  let electronProcess = null
  let assetWatcher

  const scheduleFlush = () => {
    if (actionTimer) return
    actionTimer = setTimeout(() => { void flushPendingChanges() }, 100)
  }

  const queueChange = (kind) => {
    pendingChanges[kind] = true
    scheduleFlush()
  }

  const flushPendingChanges = async () => {
    actionTimer = undefined
    if (shuttingDown) return

    if (pendingChanges.main) {
      pendingChanges.main = false
      pendingChanges.renderer = false
      await restartElectron("main graph updated")
      return
    }

    if (pendingChanges.renderer) {
      pendingChanges.renderer = false
      reloadRenderer("renderer sources updated")
    }
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

    if (pendingChanges.main || pendingChanges.renderer) scheduleFlush()
  }

  const reloadRenderer = (reason) => {
    if (!electronProcess || !electronProcess.connected) return
    console.log(`[dev] Reloading renderer (${reason})`)
    electronProcess.send({ type: "renderer-reload" })
  }

  const maybeStartElectron = () => {
    if (electronStarted) return
    if (!initialBuildDone.main || !initialBuildDone.preload) return
    electronStarted = true
    spawnElectron()
  }

  const createWatchContext = (kind, entryPoint, changeKind) => {
    return esbuild.context({
      ...createSingleEntryBuildOptions(entryPoint, "inline"),
      plugins: [{
        name: `dev-${kind}-watch`,
        setup(build) {
          build.onEnd((result) => {
            if (result.errors.length > 0 || shuttingDown) return

            if (!initialBuildDone[kind]) {
              initialBuildDone[kind] = true
              maybeStartElectron()
              return
            }

            queueChange(changeKind)
          })
        }
      }]
    })
  }

  const watchRendererAssets = () => {
    assetWatcher = chokidar.watch("src", { ignoreInitial: true })
    assetWatcher.on("all", (event, filePath) => {
      if (event !== "add" && event !== "change" && event !== "unlink") return
      if (!/\.(html|css)$/i.test(filePath)) return
      queueChange("renderer")
    })
  }

  const mainContext = await createWatchContext("main", "src/main.ts", "main")
  const preloadContext = await createWatchContext("preload", "src/preload.ts", "renderer")

  await Promise.all([mainContext.watch(), preloadContext.watch()])
  watchRendererAssets()

  const shutdown = async () => {
    if (shuttingDown) return
    shuttingDown = true

    if (actionTimer) {
      clearTimeout(actionTimer)
      actionTimer = undefined
    }

    await assetWatcher?.close()
    await Promise.allSettled([mainContext.dispose(), preloadContext.dispose()])
    await stopElectron()
    process.exit(0)
  }

  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
}

if (mode === "production") {
  await runProductionBuild()
} else if (mode === "watch") {
  await runBuildWatch()
} else {
  await runDevSupervisor()
}
