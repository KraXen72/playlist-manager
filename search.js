function search(songs, query, options) {
    const { filename = false, artist = false, album = false } = options;
    const lowerQuery = query.toLowerCase();

    return songs.filter(song => {
        if (!filename && !artist && !album) return false;

        const matches = [];
        if (filename) matches.push(song.filename.toLowerCase().includes(lowerQuery));
        if (artist && song.tag) matches.push(song.tag.artist.toLowerCase().includes(lowerQuery));
        if (album && song.tag) matches.push(song.tag.album.toLowerCase().includes(lowerQuery));

        return matches.some(Boolean);
    });
}

module.exports = { search };
