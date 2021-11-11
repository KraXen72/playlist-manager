import { BrowserWindow, ipcMain, systemPreferences } from 'electron';
import fs from "fs-extra";
interface ipcSendReceive {
	receive: string;
	send: string;
	name: string;
}

export const preloadChannels = ["test", 'accentColor'];

function mainIpcFunction(name: ipcSendReceive["name"], event: Electron.IpcMainEvent, ...args: any[]): Promise<any> {
	return new Promise(async (resolve, reject) => {
		console.log(`[mainIpc] Function ${name} with args: [${args.join(', ')}]`);
		switch (name) {
			case 'test':
				const dataTest = await fs.readFile(args.join(''));
				resolve(dataTest.toString());
				break;

			// case 'accentColor':
			// 	resolve(systemPreferences.getAccentColor());
			// 	break;

			default:
				resolve('none');
				break;
		}
	});
};

export function validChannels(string: string) {
	const validChannels: string[] = [];
	preloadChannels.forEach(v => {
		validChannels.push(generateNameChannel(v, string));
	});
	return validChannels;
}

export function generateNameChannel(channel: string, string: string) {
	return `${string}${channel.charAt(0).toUpperCase() + channel.slice(1)}`;
}

const mainIpcChannels: ipcSendReceive[] = [];

const validFromChannels = validChannels('from');
const validToChannels = validChannels('to');
for (let i = 0; i < validFromChannels.length; i++) {
	mainIpcChannels.push({
		send: validFromChannels[i],
		receive: validToChannels[i],
		name: preloadChannels[i]
	});
}

export default function appIpcMain(win: BrowserWindow) {
	mainIpcChannels.forEach(channel => {
		ipcMain.on(channel.receive, async (event, args) => {

			const data = await mainIpcFunction(channel.name, event, ...args);

			win.webContents.send(channel.send, data);
		});
	});
}