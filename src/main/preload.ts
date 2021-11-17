// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
import { dialog, shell } from '@electron/remote'
import { contextBridge, ipcRenderer } from "electron";
import * as fs from 'fs';
import { contextIsolated } from 'process';

import * as utils from '../rblib/utils.js'
const isDevelopment = process.env.NODE_ENV === "development";



const testdialog = (text: string) => {
  dialog.showMessageBoxSync({message: "hello from preload!"})
}

/**
 * multiplies number by 2
 * @param num number to multiply
 * @returns multiplied number
 */
const timestwo = (num: number) => {
  return num * 2
}

const context = {
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
  },
  timestwo, testdialog
}

export type IElectronAPI = typeof context;

contextBridge.exposeInMainWorld( "api", context );