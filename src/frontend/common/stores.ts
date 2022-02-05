import { writable, derived } from 'svelte/store';

export const currPlaylist = writable<SongItem[]>([])
export const config = writable<Config>()
export const maindir = derived(config, $config => $config?.maindir)

export const allSongs = writable<SongItem[]>([])  //TODO change this into readable store
export const allPlaylists = writable([])
export const allSongsAndPlaylists = writable([]) //derived([allSongs, allPlaylists], ([value1, value2]) => [...value1, ...value2]);
export const detailsData = writable({})
export const extraDetailsData = writable<ExtraDetailsData>()

export const tagDB = writable<tagDB>({})