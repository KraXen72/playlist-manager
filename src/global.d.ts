declare global {
    interface ExtraInfo {
        size: string,
        format: string | undefined,
        bitrate: string,
        samplerate: string,
        genre: string,
        year: string | number
    }

    interface ExtraDetailsData extends ExtraInfo {
        path: string,
        forceState: "hide" | "show" | "none",
        duration: string | number
    }

    interface CoverObj {
        frmt: "jpeg" | "png" | false,
        data: Buffer | string | ""
    }

    interface Tag {
        artist: string,
        title: string,
        album: string,
        duration: string,
        cover: string | "",
        fallbackCoverPath: string | "",
        extinf: string | "",
        coverobj:  CoverObj | boolean,
        extrainfo?: ExtraInfo | {}
    }

    interface SongItem {
        filename: string,
        fullpath: string,
        relativepath: string,
        type: "song" | "playlist",
        index: number,
        prettyName: string,
        tag?: Tag | string
    }

    interface PlaylistSongItem extends SongItem {
        songs: string[],
        type: "playlist"
    }

    interface SongItemPlus extends SongItem {
        songs?: string[]
    }
    
    interface SongItemButton {
        icon: string,
        desc: string,
        fn: string
    }
    
    interface SongItemData {
        coverid?: string | "",
        coversrc?: string | "",
        title: string,
        artist: string,
        album: string,
        filename: string,
        allSongsIndex: number,
        bold: boolean,
        nocover: boolean,
        type?: "song" | "playlist", //song or playlis
        comPlaylist?: boolean
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
            [index: string]: comPlaylist[]
        }
    }

    //tagDB
    interface tagDB {
        [filename: string]: Tag;//indexer
    }
    interface playlistOnlyMode {
        proposed: Boolean,
        real: Boolean
    }
}

export type IConfig = Config;
export type ITagDB = tagDB;
export type ISongItem = SongItem;
export type ISongItemPlus = SongItemPlus
export type ITag = Tag;
