# ⚡ Vite + TypeScript + Svelte + Electron

Special thanks to [jctaoo](https://github.com/jctaoo) for his original template [vite-electron-esbuild-starter](https://github.com/jctaoo/vite-electron-esbuild-starter).

The electron project stater using vite for frontend process and esbuild / tsc for main process.

Uses [Svelte](https://svelte.dev/) as the framework for render.

Note: CSC_IDENTITY_AUTO_DISCOVERY is set to false by default to avoid the codesign operation in packaging macos (learn more: [codesign](https://www.electron.build/code-signing))

## Usage

Create a Project:

- Clone this project directly.
- If you use GitHub, click Use this template at the top of the page or [here](https://github.com/vanjmali/vite-typescript-svelte-electron/generate) (do not check include all branch)

Installation dependencies

```shell
npm i
```
Start local development
```shell
# Use esbuild to compile the main process Typescript and run the application
npm run dev
```

Compile/Pack

```shell
# Only build the target code and resources of the main process and the rendering process, without packaging (exe, dmg, etc.)
npm run build

# Preview your application in production mode without pack.
npm run preview

# Build and pack as a runnable program or installer
npm run pack:win
npm run pack:mac
npm run pack:linux

# Pack for all platforms
npm run pack # Exclude mac platform, applicable to linux & win
npm run pack:all
```

Clean up the build directory

```shell
npm run clean
```

## File structure

Use [two-package-structure](https://www.electron.build/tutorials/two-package-structure)

```

app/                   Electron-Builder app directory and its build directory                
├─ package.json        Production dependencies, all stored as dependencies (not devDependencies)
dist/                  Electron-Builder package directory
scripts/               Support scripts for development/build.
src/                   
├─ common/             Common code
├─ main/               for main process
├─ frontend/           For frontend process
package.json           Dependencies during development, all stored as devDependencies (not dependencies)
vite.config.ts         Vite configurations
electron-builder.yml   Electron-Builder configurations

```