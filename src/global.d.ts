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

interface SongItemButton {
    icon: string,
    desc: string,
    fn: Function
}

interface comPlaylist {
    [index: string]: {
        filename: string,
        fullpath: string,
        relativepath: string,
    }
}

interface Config {
    maindir: string,
    exts: string[], 
    ignore: string[],
    comPlaylists: Object<comPlaylist>
}

