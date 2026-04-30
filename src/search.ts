const MAX_RESULTS = 100
const PREFIX_BLOCK_SIZE = 3
const lowerCache = new WeakMap<SearchableEntry, {
    filenameRaw: string
    filenameLower: string
    artistRaw?: string
    artistLower?: string
    albumRaw?: string
    albumLower?: string
}>()

function getLowerValues(song: SearchableEntry) {
    const filenameRaw = song.filename ?? ''
    const artistRaw = song.tag?.artist
    const albumRaw = song.tag?.album
    const cached = lowerCache.get(song)

    if (
        cached &&
        cached.filenameRaw === filenameRaw &&
        cached.artistRaw === artistRaw &&
        cached.albumRaw === albumRaw
    ) {
        return cached
    }

    const next = {
        filenameRaw,
        filenameLower: filenameRaw.toLowerCase(),
        artistRaw,
        artistLower: artistRaw ? artistRaw.toLowerCase() : undefined,
        albumRaw,
        albumLower: albumRaw ? albumRaw.toLowerCase() : undefined
    }
    lowerCache.set(song, next)
    return next
}

function getMatchKind(song: SearchableEntry, lowerQuery: string, filename: boolean, artist: boolean, album: boolean): 0 | 1 | -1 {
    const values = getLowerValues(song)
    let hasSubstringMatch = false

    if (song.type === 'artist') {
        if (!artist) return -1
        const idx = values.filenameLower.indexOf(lowerQuery)
        if (idx === 0) return 0
        return idx > 0 ? 1 : -1
    }

    if (song.type === 'album') {
        if (!album) return -1
        const idx = values.filenameLower.indexOf(lowerQuery)
        if (idx === 0) return 0
        return idx > 0 ? 1 : -1
    }

    if (filename) {
        const idx = values.filenameLower.indexOf(lowerQuery)
        if (idx === 0) return 0
        if (idx > 0) hasSubstringMatch = true
    }

    if (artist && values.artistLower) {
        const idx = values.artistLower.indexOf(lowerQuery)
        if (idx === 0) return 0
        if (idx > 0) hasSubstringMatch = true
    }

    if (album && values.albumLower) {
        const idx = values.albumLower.indexOf(lowerQuery)
        if (idx === 0) return 0
        if (idx > 0) hasSubstringMatch = true
    }

    return hasSubstringMatch ? 1 : -1
}

export function search(songs: SearchableEntry[], query: string, options: SearchOptions = {}) {
    const { filename = false, artist = false, album = false } = options
    if (!filename && !artist && !album) return []

    const lowerQuery = query.toLowerCase()
    const prefixMatches: SearchableEntry[] = []
    const substringMatches: SearchableEntry[] = []

    for (const song of songs) {
        const matchKind = getMatchKind(song, lowerQuery, filename, artist, album)
        if (matchKind === 0) {
            if (prefixMatches.length < MAX_RESULTS) prefixMatches.push(song)
        } else if (matchKind === 1) {
            if (substringMatches.length < MAX_RESULTS) substringMatches.push(song)
        }
    }

    const results: SearchableEntry[] = []
    let p = 0
    let s = 0

    while (results.length < MAX_RESULTS && (p < prefixMatches.length || s < substringMatches.length)) {
        for (let i = 0; i < PREFIX_BLOCK_SIZE && p < prefixMatches.length && results.length < MAX_RESULTS; i++) {
            results.push(prefixMatches[p++])
        }
        if (s < substringMatches.length && results.length < MAX_RESULTS) {
            results.push(substringMatches[s++])
        }
    }

    return results
}
