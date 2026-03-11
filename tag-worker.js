const { parentPort } = require('worker_threads')
const { DatabaseSync } = require('node:sqlite')
const fs = require('fs')

const CONCURRENCY = 8

let mm = null
import('music-metadata').then(mod => { mm = mod }).catch(() => {})

parentPort.on('message', async ({ songs, dbPath }) => {
	if (!mm) mm = await import('music-metadata')

	const tagDb = new DatabaseSync(dbPath)
	const stmtGet = tagDb.prepare('SELECT mtime FROM tags WHERE path = ?')
	const stmtUpsert = tagDb.prepare(
		'INSERT OR REPLACE INTO tags VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
	)

	const total = songs.length
	let done = 0

	async function processSong({ songPath, filename }) {
		try {
			const stat = await fs.promises.stat(songPath)
			const mtime = Math.round(stat.mtimeMs)
			const row = stmtGet.get(songPath)
			if (row && row.mtime === mtime) return // cache hit, skip parsing

			let metadata
			try {
				metadata = await mm.parseFile(songPath, { skipCovers: false, duration: false })
			} catch (e) {
				metadata = {
					common: {},
					format: { duration: 1, bitrate: 'unknown', sampleRate: 'unknown' },
					quality: { warnings: ['failed'] }
				}
			}

			let artist = metadata.common.artist ?? 'Unknown Artist'
			const title = metadata.common.title ?? filename
			const album = metadata.common.album ?? 'Unknown Album'
			const duration = (metadata.format.duration == null || parseInt(metadata.format.duration) < 1)
				? '000001'
				: metadata.format.duration.toFixed(3).replaceAll('.', '')

			if (metadata.common.artists?.length > 1) {
				artist = metadata.common.artists.join(' / ')
			}

			const extrainfo = {
				size: (stat.size / 1000000).toFixed(2) + ' MB',
				format: metadata.format.codec ?? 'Unknown',
				bitrate: typeof metadata.format.bitrate === 'number'
					? Math.round(metadata.format.bitrate / 1000) + ' kb/s'
					: 'Unknown',
				samplerate: (metadata.format.sampleRate != null && metadata.format.sampleRate !== 'unknown')
					? metadata.format.sampleRate.toString() + ' Hz'
					: 'Unknown',
				genre: metadata.common.genre?.length
					? metadata.common.genre.join(' / ')
					: 'Unknown Genre',
				year: metadata.common.year ?? 'Unknown Year'
			}

			const pic = mm.selectCover(metadata.common.picture)
			const coverData = pic ? pic.data : null
			const coverFmt = pic ? pic.format.replace('image/', '') : null

			stmtUpsert.run(
				songPath, mtime,
				artist, title, album, duration,
				coverData, coverFmt,
				extrainfo.size, extrainfo.format, extrainfo.bitrate,
				extrainfo.samplerate, extrainfo.genre,
				extrainfo.year != null ? extrainfo.year.toString() : null
			)
		} catch (e) {
			console.error('tag-worker: failed to process', songPath, e.message)
		} finally {
			done++
			parentPort.postMessage({ type: 'progress', done, total })
		}
	}

	for (let i = 0; i < songs.length; i += CONCURRENCY) {
		await Promise.allSettled(songs.slice(i, i + CONCURRENCY).map(processSong))
	}

	tagDb.close()
	parentPort.postMessage({ type: 'done' })
})
