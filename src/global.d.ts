declare global {
    interface SongItem {
        filename: string,
        fullpath: string,
        relativepath: string,
        type: "song" | "playlist",
        index: number,
        tag?: {
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
    
    interface SongItemButton {
        icon: string,
        desc: string,
        fn: Function
    }
    interface SongItemData {
        coverid?: string | "",
        coversrc?: string | "",
        title: string,
        artist: string,
        album: string,
        filename: string,
        bold: boolean,
        nocover: boolean,
        type?: "song" | "playlist", //song or playlis
    }
    
    interface comPlaylist {
        filename: string,
        fullpath: string,
        relativepath: string,
    }
    interface Config {
        maindir: string,
        exts: string[], 
        ignore: string[],
        comPlaylists: {
            [index: string]: comPlaylist
        }
    }
}

export type IConfig = Config;
export type ISongItem = SongItem;
