import { app, BrowserWindow, systemPreferences } from "electron";
import path from "path";
import { pathToFileURL } from "url";
import * as remote from '@electron/remote/main'

const isDevelopment = process.env.NODE_ENV === "development";

remote.initialize() 

function createWindow() {
	const win = new BrowserWindow({
		width: 1280,
		height: 720,
		webPreferences: {
			nodeIntegration: true,
			// contextIsolation: false, // protect against prototype pollution
			contextIsolation: true, // protect against prototype pollution
			//enableRemoteModule: false, // turn off remote
			preload: path.join(__dirname, 'preload.js')/*,
			nativeWindowOpen: isDevelopment*/
		},
		show: false,
	}).once("ready-to-show", () => {
		win.show();
	});

	if (isDevelopment) {
		
		win.loadURL("http://localhost:3000");
		win.webContents.toggleDevTools();

		try {
			require('electron-reloader')(module, {
				debug: false,
				watchRenderer: true,
				ignore: ["**/*.svelte", "**/*.css", "**/*.html", "**/common/**/*", "**/config.json" ]
			});
		} catch (_) { console.log('electron-reloader made an oopsie'); }

	} else {
		win.loadURL(
			pathToFileURL(path.join(__dirname, "./frontend/index.html")).toString()
		);
	}
	win.setMenuBarVisibility(false);
	remote.enable(win.webContents)
	//win.removeMenu();

	// systemPreferences.on('accent-color-changed', (event, newColor) => {
	// 	console.log(`[theme] new Accent Color detected ${newColor}`);
	// 	win.webContents.send('fromAccentColor', newColor);
	// });
}



app.whenReady().then(createWindow);


app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
	return;
});

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});
