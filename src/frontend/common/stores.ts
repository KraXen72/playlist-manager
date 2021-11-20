import { writable } from 'svelte/store';

export const currPlayList = writable<SongItem[]>([])
export const config = writable<Config>({})