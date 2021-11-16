import { writable } from 'svelte/store';


export const currPlayList = writable<SongItem[]>([])