/**
 * Active search modes. At least one must always be true.
 * filename: match against song.filename
 * artist:   match against song.tag.artist (requires tags fetched)
 * album:    match against song.tag.album  (requires tags fetched)
 */
const searchModes = {
	filename: true,
	artist: false,
	album: false
}

/**
 * Returns true if any tag-based mode (artist or album) is currently active.
 */
function needsTags() {
	return searchModes.artist || searchModes.album
}

/**
 * Toggle a search mode on/off, preventing the last active mode from being turned off.
 * @param {'filename'|'artist'|'album'} mode
 * @returns {boolean} whether the state changed
 */
function toggleSearchMode(mode) {
	const currentlyActive = searchModes[mode]
	if (currentlyActive) {
		// count how many are active
		const activeCount = Object.values(searchModes).filter(Boolean).length
		if (activeCount <= 1) {
			// can't deselect the last one
			return false
		}
	}
	searchModes[mode] = !currentlyActive
	return true
}

/**
 * Filter an array of song/playlist objects by the given input string,
 * using the currently active searchModes.
 *
 * @param {Array}  arr   - array of song/playlist objects
 * @param {string} input - the search string
 * @returns {Array} filtered results
 */
function filterBySearchModes(arr, input) {
	const q = input.toLowerCase()
	return arr.filter(item => {
		if (item.type === 'playlist') {
			// playlists always match by filename
			return item.filename.toLowerCase().includes(q)
		}
		let match = false
		if (searchModes.filename) {
			match = match || item.filename.toLowerCase().includes(q)
		}
		if (searchModes.artist && item.tag) {
			match = match || (item.tag.artist || '').toLowerCase().includes(q)
		}
		if (searchModes.album && item.tag) {
			match = match || (item.tag.album || '').toLowerCase().includes(q)
		}
		return match
	})
}

/**
 * Filter only songs that contain special (non-ASCII) characters in their filename.
 * @param {Array} arr array of song objects
 * @returns {Array}
 */
function filterSpecial(arr) {
	const regex = /[^\x00-\x7F]/gi
	return arr.filter(item => item.filename.match(regex))
}

module.exports = { searchModes, needsTags, toggleSearchMode, filterBySearchModes, filterSpecial }
