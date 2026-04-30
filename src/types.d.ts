declare global {
  interface CoverObject {
    frmt: string
    data: Buffer | Uint8Array
  }

  interface TagExtraInfo {
    size?: string
    format?: string
    bitrate?: string
    samplerate?: string
    genre?: string
    year?: string | number
  }

  interface SongTag {
    artist: string
    title: string
    album: string
    duration: string | number
    cover: string
    extinf: string
    coverobj: CoverObject | false
    extrainfo: TagExtraInfo
  }

  interface BaseEntry {
    filename: string
    fullpath: string
    relativepath: string | null
    index: string
    type: "song" | "playlist" | "artist" | "album"
    tag?: SongTag
    songs?: SongEntry[] | string[] | null
    mode?: "new" | "com"
  }

  interface SongEntry extends BaseEntry {
    type: "song"
    relativepath: string
  }

  interface PlaylistEntry extends BaseEntry {
    type: "playlist"
    songs: string[]
  }

  interface GroupEntry extends BaseEntry {
    type: "artist" | "album"
    songs?: SongEntry[] | null
  }

  interface SearchableEntry {
    filename: string
    type: "song" | "playlist" | "artist" | "album"
    tag?: {
      artist?: string
      album?: string
      title?: string
      cover?: string
      extinf?: string
      coverobj?: CoverObject | false
      extrainfo?: TagExtraInfo
    }
    [key: string]: unknown
  }

  interface SearchOptions {
    filename?: boolean
    artist?: boolean
    album?: boolean
  }

  interface ConfigPlaylistRef {
    filename: string
    fullpath: string
    relativepath: string | null
  }

  interface AppConfig {
    maindir: string
    exts: string[]
    ignore: string[]
    comPlaylists: Record<string, ConfigPlaylistRef[]>
    includeArtistResults?: boolean
    includeAlbumResults?: boolean
  }

  interface TagCacheRow {
    path: string
    mtime: number
    artist: string
    title: string
    album: string
    duration: string
    cover_data: Uint8Array | Buffer | null
    cover_fmt: string | null
    ei_size: string | null
    ei_format: string | null
    ei_bitrate: string | null
    ei_samplerate: string | null
    ei_genre: string | null
    ei_year: string | null
  }

  interface EventTarget {
    [key: string]: any
  }

  interface Document {
    getElementById(elementId: string): any
    querySelector(selectors: string): any
    querySelectorAll(selectors: string): any[]
  }

  interface Element {
    querySelector(selectors: string): any
    querySelectorAll(selectors: string): any[]
    [key: string]: any
  }

  interface NotificationOptions {
    timeoutType?: string
  }
}

export {}
