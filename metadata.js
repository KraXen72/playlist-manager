const fs = require('fs')
const utils = require('./node_modules/roseboxlib/utils.js')
const db = require('./db-handler.js')

//read the file and get it's metadata
/**
 * read song file to get metadata
 * @param {String} song full path to file
 * @param {String} onlysong relative path to file (no folder)
 * @param {Boolean} returnObj if true, return full object instead of EXTINF string
 * @param {Boolean} skipCovers if true, skip fetching covers (faster)
 * @param {Boolean} fetchExtraInfo if true, fetch extra info
 */
async function getEXTINF(song, onlysong, returnObj, skipCovers, fetchExtraInfo) {
	// --- cache hit path ---
	if (returnObj) {
		const cached = db.getTag(song)
		if (cached) return cached
	}

	const mm = await import('music-metadata')
	var metadata
	try {
		metadata = await mm.parseFile(song, { "skipCovers": skipCovers, "duration": false })
	} catch (e) {
		console.warn(song, e)
		metadata = { //when we get Error: EINVAL: invalid argument, read for certain songs, make a dummy extinf
			common: {}, format: { duration: 1, bitrate: "unknown", sampleRate: "unknown" }, quality: { warnings: ["failed to get extinf"] }
		}
	}
	metadata.quality.warnings = metadata.quality.warnings.length //replace warnings array with just the number of warnings
	//console.log("metadata: ",metadata)

	let extrainfo = {}

	var artist = metadata.common.artist === undefined ? "Unknown Artist" : metadata.common.artist
	const title = metadata.common.title === undefined ? onlysong : metadata.common.title
	const album = metadata.common.album === undefined ? "Unknown Album" : metadata.common.album
	const duration = metadata.format.duration === undefined || parseInt(metadata.format.duration) < 1 ? "000001" : metadata.format.duration.toFixed(3).replaceAll(".", "")

	if (metadata.common.artists !== undefined && metadata.common.artists.length > 1) {
		artist = metadata.common.artists.join(" / ")
	}

	// always build extrainfo when caching so the DB row is always complete;
	// also satisfies fetchExtraInfo=true callers
	if (returnObj) {
		const lstat = await fs.promises.lstat(song)
		extrainfo.size = (lstat.size / 1000000).toFixed(2).toString() + " MB"
		extrainfo.format = metadata.format.codec
		extrainfo.bitrate = typeof metadata.format.bitrate === 'number'
			? Math.round(metadata.format.bitrate / 1000).toString() + " kb/s"
			: "Unknown"
		extrainfo.samplerate = metadata.format.sampleRate != null && metadata.format.sampleRate !== "unknown"
			? metadata.format.sampleRate.toString() + " Hz"
			: "Unknown"
		if (metadata.common.genre !== undefined && metadata.common.genre.length !== 0) {
			extrainfo.genre = metadata.common.genre.join(" / ")
		} else {
			extrainfo.genre = "Unknown Genre"
		}
		extrainfo.year = metadata.common.year !== undefined ? metadata.common.year : "Unknown Year"
	}

	const extinf = `#EXTINF:${duration},${artist} - ${title}`

	if (!skipCovers) {
		const pic = mm.selectCover(metadata.common.picture)
		var cover = ""
		var coverobj
		if (pic !== undefined && pic !== null) {
			let frmt = pic.format.replaceAll("image/", "")

			cover = `data:${pic.format};base64,${pic.data.toString('base64')}`
			coverobj = { frmt, "data": pic.data }
		} else {
			cover = ""
			coverobj = false
		}
	}

	// --- cache write ---
	if (returnObj) {
		db.upsertTag(song, { artist, title, album, duration, cover, extinf, coverobj, extrainfo })
	}

	//console.log(extinf)
	if (returnObj) {
		return { artist, title, album, duration, cover, extinf, coverobj, extrainfo }
	} else {
		return extinf
	}
}

module.exports = { getEXTINF }
