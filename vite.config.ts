import { defineConfig } from "vite";
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from "path";
import timeReporter from 'vite-plugin-time-reporter';

const frontendPath = path.resolve(__dirname, "src/frontend");
const srcPath = path.resolve(__dirname, "src");
const outDirfrontend = path.resolve(__dirname, "app/frontend");

//console.log("publicdir: ", path.resolve(__dirname, "./db"))

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		svelte({ configFile: './../../svelte.config.js' }),
		timeReporter()
	],
	base: "./",
	root: frontendPath,
	build: {
		outDir: outDirfrontend,
		emptyOutDir: true,
	},
	logLevel: 'info',
	server: {
		watch: {
		  ignored: ['!**/db']
		}
	},
	publicDir: path.resolve(__dirname, "./db"),
	resolve: {
		alias: {
			$rblib: path.resolve('./src/rblib'), 
			$components: path.resolve("./src/frontend/components"),
			$common: path.resolve("./src/frontend/common"),
			$assets: path.resolve("./src/frontend/assets"),
			$frontend: frontendPath,
		},
		extensions: ['.js', '.ts', 'json', '.svelte', '.css'],
		/*alias: [
			{
				find: "$rblib",
				replacement: path.resolve("./src/rblib"),
			},
			{
				find: "$frontend",
				replacement: frontendPath,
			},
			{
				find: "@components",
				replacement: path.resolve(frontendPath, "components"),
			},
			{
				find: "@common",
				replacement: path.resolve(frontendPath, "common"),
			},
			{
				find: "$assets",
				replacement: path.resolve(frontendPath, "assets"),
			}
		],*/
	}
});
