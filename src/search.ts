import uFuzzy from '@leeoniya/ufuzzy';

const MAX_RESULTS = 100
const uFuzzyInstance = new uFuzzy();

export function search<T extends SelectableEntry>(songs: T[], query: string, options: SearchOptions = {}): T[] {
    const { filename = false, artist = false, album = false } = options
    if (!filename && !artist && !album) return []

    const lowerQuery = query.toLowerCase()

    return results
}
