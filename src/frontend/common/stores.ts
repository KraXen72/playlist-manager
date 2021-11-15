import { writable } from 'svelte/store';

declare global {
    interface SongItem {
        filename: string,
        fullpath: string,
        relativepath: string,
        type: "song" | "playlist",
        index: string, //TODO fix this so it's a number
        tag: {
            artist: string,
            title: string,
            album: string,
            duration: string,
            cover: string | "",
            extinf: string | "",
            coverobj: {
                frmt: "jpeg" | "png",
                data: string | ""
            } | "",
            extrainfo: object | ""
        } | ""
    }
}


export const currPlayList = writable<SongItem[]>([])