import uFuzzy from '@leeoniya/ufuzzy'

const MAX_RESULTS = 100
const SEP = '\x00'
const uFuzzyInstance = new uFuzzy()

function toSearchText(
    entry: SelectableEntry,
    filename: boolean,
    artist: boolean,
    album: boolean
): string | null {
    if (entry.type === 'artist') return artist ? entry.filename : null
    if (entry.type === 'album') return album ? entry.filename : null

    const parts: string[] = []

    if (filename) parts.push(entry.filename)
    if (artist && entry.tag?.artist) parts.push(entry.tag.artist)
    if (album && entry.tag?.album) parts.push(entry.tag.album)

    return parts.length > 0 ? parts.join(SEP) : null
}

export function search<T extends SelectableEntry>(songs: T[], query: string, options: SearchOptions = {}): T[] {
    const { filename = false, artist = false, album = false } = options
    if (!filename && !artist && !album) return []

    const candidates: T[] = []
    const haystack: string[] = []

    for (let i = 0; i < songs.length; i++) {
        const song = songs[i]
        const text = toSearchText(song, filename, artist, album)
        if (text == null) continue
        candidates.push(song)
        haystack.push(text)
    }

    if (candidates.length === 0) return []

    const needle = query.trim()
    if (needle === '') return candidates.slice(0, MAX_RESULTS)

    const [, info, order] = uFuzzyInstance.search(haystack, needle)
    if (info == null || order == null) return []

    const out: T[] = []
    for (let i = 0; i < order.length && out.length < MAX_RESULTS; i++) {
        out.push(candidates[info.idx[order[i]]])
    }

    return out
}
