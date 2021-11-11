// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

import { dialog, shell } from '@electron/remote'
import { contextBridge, ipcRenderer } from "electron";
import * as fs from 'fs';
import { createDeflate } from 'zlib';
import { fixQuotes } from '../rblib/utils.js'
const isDevelopment = process.env.NODE_ENV === "development";


interface contextInterface {
  [ index: string ]: Function;
}

const timestwo = (num: number) => {
  return num * 2
}
const testdialog = (text: string) => {
  dialog.showMessageBoxSync({message: "hello from preload!"})
}

const context: contextInterface = {
  send: (channel: string, data: any) => {
      // whitelist channels
      let validChannels = ["toMain", "requestSystemInfo"];
      if (validChannels.includes(channel)) {
          ipcRenderer.send(channel, data);
      }
  },
  on: (channel: string, func: (arg0: any) => void) => {
      let validChannels = ["fromMain", "getSystemInfo"];
      if (validChannels.includes(channel)) {
          // Deliberately strip event as it includes `sender`
          // @ts-ignore
          ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
  }
}

Object.assign(context, {timestwo, testdialog, fixQuotes}) //add functions here
//console.log(context)
contextBridge.exposeInMainWorld(
    "api", context
);

console.log("woo")
/*
if (isDevelopment) {
	document.addEventListener('DOMContentLoaded', () => {
		let s = document.createElement('script')
		s.src = `https://cdn.jsdelivr.net/gh/redhatter/svelte-devtools-standalone@master/dist/standalone.js`
		document.head.appendChild(s)
	})
}*/