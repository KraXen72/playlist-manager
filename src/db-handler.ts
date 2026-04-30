import electron from '@electron/remote'
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync, type StatementSync } from 'node:sqlite'

const { app } = electron
const cacheDir = path.join(app.getPath('cache' as Parameters<typeof app.getPath>[0]), 'playlist-manager')
fs.mkdirSync(cacheDir, { recursive: true })
const DB_LOCATION = path.join(cacheDir, 'tagcache.db')

let tagDb: DatabaseSync | null = null
let stmtGet: StatementSync | null = null
let stmtUpsert: StatementSync | null = null
let stmtDistinctArtists: StatementSync | null = null
let stmtDistinctAlbums: StatementSync | null = null
let stmtPathsByArtist: StatementSync | null = null
let stmtPathsByAlbum: StatementSync | null = null

function openTagCache(): void {
	tagDb = new DatabaseSync(DB_LOCATION)
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

export function rowToTag(row: TagCacheRow): SongTag {
	// coverobj holds raw Buffer; callers send to main process via IPC for mem:// protocol
	const coverobj: CoverObject | false = row.cover_data && row.cover_fmt
		? { frmt: row.cover_fmt, data: Buffer.from(row.cover_data) }
		: false
	const extinf = `#EXTINF:${row.duration},${row.artist} - ${row.title}`
	const extrainfo: TagExtraInfo = {
		size: row.ei_size, format: row.ei_format, bitrate: row.ei_bitrate,
		samplerate: row.ei_samplerate, genre: row.ei_genre, year: row.ei_year
	}
	return {
		artist: row.artist, title: row.title, album: row.album,
		duration: row.duration, cover: '', extinf, coverobj, extrainfo
	}
}

export function getTag(songPath: string): SongTag | null {
	if (!stmtGet) return null
	const row = stmtGet.get(songPath) as unknown as TagCacheRow | undefined
	if (row === undefined) return null
	let mtime: number
	try {
		mtime = Math.round(fs.statSync(songPath).mtimeMs)
	} catch (err) {
		if (err.code === 'ENOENT') return null
		throw err
	}
	if (row.mtime !== mtime) return null
	return rowToTag(row)
}

export function getAllTagsMap(paths: string[]): Map<string, TagCacheRow> {
	if (!tagDb || paths.length === 0) return new Map<string, TagCacheRow>()
	const map = new Map<string, TagCacheRow>()
	// SQLite's SQLITE_MAX_VARIABLE_NUMBER is 999 in older builds; chunk to stay safe
	const CHUNK = 900
	for (let i = 0; i < paths.length; i += CHUNK) {
		const chunk = paths.slice(i, i + CHUNK)
		const placeholders = chunk.map(() => '?').join(',')
		const stmt = tagDb.prepare(`SELECT * FROM tags WHERE path IN (${placeholders})`)
		const rows = stmt.all(...chunk) as unknown as TagCacheRow[]
		for (const row of rows) map.set(row.path, row)
	}
	return map
}

export function upsertTag(songPath: string, tag: SongTag, mtime?: number): void {
	if (!stmtUpsert) return
	let resolvedMtime: number
	if (mtime === undefined) {
		try {
			resolvedMtime = Math.round(fs.statSync(songPath).mtimeMs)
		} catch (err) {
			if (err.code === 'ENOENT') throw new Error(`File not found: ${songPath}`)
			throw err
		}
	} else {
		resolvedMtime = mtime
	}
	stmtUpsert.run(
		songPath,
		resolvedMtime,
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

export function getDistinctArtists(): TagDistinctArtistRow[] {
	return stmtDistinctArtists ? stmtDistinctArtists.all() as unknown as TagDistinctArtistRow[] : []
}

export function getDistinctAlbums(): TagDistinctAlbumRow[] {
	return stmtDistinctAlbums ? stmtDistinctAlbums.all() as unknown as TagDistinctAlbumRow[] : []
}

export function getPathsByArtist(name: string): string[] {
	return stmtPathsByArtist ? (stmtPathsByArtist.all(name) as unknown as TagPathRow[]).map(r => r.path) : []
}

export function getPathsByAlbum(name: string): string[] {
	return stmtPathsByAlbum ? (stmtPathsByAlbum.all(name) as unknown as TagPathRow[]).map(r => r.path) : []
}

openTagCache()
