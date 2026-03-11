const { DatabaseSync } = require('node:sqlite')
const fs = require('fs')
const path = require('node:path')

const { app } = require('@electron/remote')
const cacheDir = path.join(app.getPath('cache'), 'playlist-manager')
fs.mkdirSync(cacheDir, { recursive: true })
const DB_LOCATION = path.join(cacheDir, 'tagcache.db')

let stmtGet = null
let stmtUpsert = null
let stmtDistinctArtists = null
let stmtDistinctAlbums = null
let stmtPathsByArtist = null
let stmtPathsByAlbum = null

function openTagCache() {
	const tagDb = new DatabaseSync(DB_LOCATION)
	tagDb.exec(`
        CREATE TABLE IF NOT EXISTS tags (
            path          TEXT PRIMARY KEY,
            mtime         INTEGER NOT NULL,
            artist        TEXT,
            title         TEXT,
            album         TEXT,
            duration      TEXT,
            cover_data    BLOB,
            cover_fmt     TEXT,
            ei_size       TEXT,
            ei_format     TEXT,
            ei_bitrate    TEXT,
            ei_samplerate TEXT,
            ei_genre      TEXT,
            ei_year       TEXT
        )
    `)
	stmtGet = tagDb.prepare('SELECT * FROM tags WHERE path = ?')
	stmtUpsert = tagDb.prepare('INSERT OR REPLACE INTO tags VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
	stmtDistinctArtists = tagDb.prepare('SELECT artist, COUNT(*) as cnt FROM tags GROUP BY artist ORDER BY artist')
	stmtDistinctAlbums = tagDb.prepare('SELECT album, COUNT(*) as cnt FROM tags GROUP BY album ORDER BY album')
	stmtPathsByArtist = tagDb.prepare('SELECT path FROM tags WHERE artist = ?')
	stmtPathsByAlbum = tagDb.prepare('SELECT path FROM tags WHERE album = ?')
	console.log(`tagcache: opened ${DB_LOCATION}`)
}

/**
 * Return a cached tag object for `songPath` if the file has not changed, else null.
 * @param {string} songPath absolute path to the audio file
 * @returns {object|null}
 */
function getTag(songPath) {
	if (!stmtGet) return null
	const row = stmtGet.get(songPath)
	if (row === undefined) return null
	if (row === undefined) return null
	let mtime
	try {
		mtime = Math.round(fs.statSync(songPath).mtimeMs)
	} catch (err) {
		if (err.code === 'ENOENT') return null
		throw err
	}
	if (row.mtime !== mtime) return null

	const coverobj = row.cover_data
		? { frmt: row.cover_fmt, data: Buffer.from(row.cover_data) }
		: false
	const cover = coverobj
		? `data:image/${coverobj.frmt};base64,${coverobj.data.toString('base64')}`
		: ''
	const extinf = `#EXTINF:${row.duration},${row.artist} - ${row.title}`
	const extrainfo = {
		size: row.ei_size, format: row.ei_format, bitrate: row.ei_bitrate,
		samplerate: row.ei_samplerate, genre: row.ei_genre, year: row.ei_year
	}
	return {
		artist: row.artist, title: row.title, album: row.album,
		duration: row.duration, cover, extinf, coverobj, extrainfo
	}
}

/**
 * Persist a parsed tag object to the cache.
 * @param {string} songPath absolute path to the audio file
 * @param {object} tag full tag object returned by getEXTINF
 */
function upsertTag(songPath, tag) {
	if (!stmtUpsert) return
	let mtime
	try {
		mtime = Math.round(fs.statSync(songPath).mtimeMs)
	} catch (err) {
		if (err.code === 'ENOENT') throw new Error(`File not found: ${songPath}`)
		throw err
	}
	stmtUpsert.run(
		songPath,
		mtime,
		tag.artist, tag.title, tag.album, tag.duration,
		tag.coverobj ? tag.coverobj.data : null,
		tag.coverobj ? tag.coverobj.frmt : null,
		tag.extrainfo.size ?? null,
		tag.extrainfo.format ?? null,
		tag.extrainfo.bitrate ?? null,
		tag.extrainfo.samplerate ?? null,
		tag.extrainfo.genre ?? null,
		tag.extrainfo.year != null ? tag.extrainfo.year.toString() : null
	)
}

function getDistinctArtists() { return stmtDistinctArtists ? stmtDistinctArtists.all() : [] }
function getDistinctAlbums() { return stmtDistinctAlbums ? stmtDistinctAlbums.all() : [] }
function getPathsByArtist(name) { return stmtPathsByArtist ? stmtPathsByArtist.all(name).map(r => r.path) : [] }
function getPathsByAlbum(name) { return stmtPathsByAlbum ? stmtPathsByAlbum.all(name).map(r => r.path) : [] }

openTagCache()

module.exports = { getTag, upsertTag, getDistinctArtists, getDistinctAlbums, getPathsByArtist, getPathsByAlbum }
