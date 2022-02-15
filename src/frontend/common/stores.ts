import { writable, derived } from 'svelte/store';

export const currPlaylist = writable<SongItemPlus[]>([])
export const config = writable<Config>()
export const maindir = derived(config, $config => $config?.maindir)
export const playlistOnlyMode = writable<playlistOnlyMode>({proposed: false, real: false})
export const allSongs = writable<SongItem[]>([])  //TODO change this into readable store
export const allPlaylists = writable<PlaylistSongItem[]>([])
export const allSongsAndPlaylists = writable<SongItemPlus[]>([]) //derived([allSongs, allPlaylists], ([value1, value2]) => [...value1, ...value2]);
export const detailsData = writable({})
//@ts-ignore
export const extraDetailsData = writable<ExtraDetailsData>({})
export const viewCoverPath = writable<(string|false)>(false)

export const tagDB = writable<tagDB>({})