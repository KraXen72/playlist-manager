function search(songs, query, options) {
    const { filename = false, artist = false, album = false } = options;
    const lowerQuery = query.toLowerCase();

    const results = songs.filter(song => {
        if (!filename && !artist && !album) return false;

        const matches = [];
        if (filename) matches.push(song.filename.toLowerCase().includes(lowerQuery));
        if (artist && song.tag) matches.push(song.tag.artist.toLowerCase().includes(lowerQuery));
        if (album && song.tag) matches.push(song.tag.album.toLowerCase().includes(lowerQuery));

        return matches.some(Boolean);
    });

    results.sort((a, b) => {
        const aLower = a.filename.toLowerCase();
        const bLower = b.filename.toLowerCase();
        const aIndex = aLower.indexOf(lowerQuery);
        const bIndex = bLower.indexOf(lowerQuery);

        if (aIndex !== bIndex) {
            return aIndex - bIndex;
        }

        if (a.type !== b.type) {
            return a.type === 'song' ? -1 : 1;
        }

        return aLower.localeCompare(bLower);
    });

    return results;
}

module.exports = { search };
