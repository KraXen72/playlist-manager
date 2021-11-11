import { defineConfig } from "vite";
import svelte from '@sveltejs/vite-plugin-svelte';
import path from "path";

const frontendPath = path.resolve(__dirname, "src/frontend");
const outDirfrontend = path.resolve(__dirname, "app/frontend");

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [svelte({ configFile: './../../svelte.config.js' })],
	base: "./",
	root: frontendPath,
	build: {
		outDir: outDirfrontend,
		emptyOutDir: true,
	},
	logLevel: 'info',
	resolve: {
		alias: [
			{
				find: "@frontend",
				replacement: frontendPath,
			},
			{
				find: "@common",
				replacement: path.resolve(__dirname, "src/common"),
			},
			{
				find: "@components",
				replacement: path.resolve(frontendPath, "components"),
			},
			{
				find: "@assets",
				replacement: path.resolve(frontendPath, "assets"),
			},
			{
				find: "@rblib",
				replacement: path.resolve(__dirname, "src/rblib"),
			}
		],
		extensions: ['.js', '.ts', 'json', '.svelte']
	},
});
