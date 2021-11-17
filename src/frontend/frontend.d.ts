import { IElectronAPI } from './../main/preload';

declare global {
    interface Window {
      api: IElectronAPI
    }
}