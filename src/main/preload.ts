//import { allSongs, allPlaylists, allSongsAndPlaylists, config } from './../frontend/common/stores';
// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
import { dialog, shell } from '@electron/remote'
import { contextBridge, ipcRenderer, OpenDialogSyncOptions } from "electron";
import * as fsWalk from '@nodelib/fs.walk';
import * as path from 'path';
import * as mm from 'music-metadata';

import { initOrLoadConfig, saveConfig, getExtOrFn } from '../rblib/utils.js'

//we don't need to know about config if we just pass the values from svelte here
//import { config } from './../frontend/common/stores'
import type { IConfig, ISongItem } from './../global';

const isDevelopment = process.env.NODE_ENV === "development";

const slash = process.platform === 'win32' ? "\\" : "/"

const testdialog = (text: string) => {
  dialog.showMessageBoxSync({message: "hello from preload!"})
}

// electron stuff

/**
 * opens electron's folder select dialog
 * @param title the title of the dialog
 */
const pickFolder = (title: string) => {
  let opts: OpenDialogSyncOptions = {
    title, properties: ["openDirectory"]
  }

  let pick = dialog.showOpenDialogSync(opts)
  return pick
}

const walker = {
  songs: (basedDir: string, config: IConfig) => { //only takes 70ms!!!
    let songs = fsWalk.walkSync(basedDir, {stats: true}).filter(entry => {

      let ext = path.extname(entry.name).replaceAll(" ", "").replace(".", "") //strip spaces and dot from ext
      return entry.dirent.isFile() && config.exts.includes(ext) //if is a file and valid ext, it passes

    }).map((song, i) => {
      const parts = song.name.split(slash)

      const sItem: ISongItem = {
    	 	filename: song.name,
        fullpath: song.path,
        prettyName: getExtOrFn(parts[parts.length - 1]).fn,
        index: i,
        relativepath: song.path.replaceAll(basedDir, "").replace(slash, ""),
        type: "song"
      }
      return sItem
    })
    return songs
  }
}

//read the file and get it's metadata
/**
 * read song file to get metadata
 * @param {String} song full path to file
 * @param {String} onlysong relative path to file (no folder)
 * @param {Boolean} returnObj if true, return full object instead of EXTINF string
 * @param {Boolean} skipCovers if true, skip fetching covers (faster)
 * @param {Boolean} fetchExtraInfo if true, fetch extra info
 */
//  async function getEXTINF(song, onlysong, returnObj, skipCovers, fetchExtraInfo) {
//   var metadata
//   try {
//       metadata = await mm.parseFile(song, {"skipCovers": skipCovers, "duration": false})
//   } catch (e) {
//       console.warn(song, e)
//       metadata = { //when we get Error: EINVAL: invalid argument, read for certain songs, make a dummy extinf
//           common: {}, format: { duration: 1, bitrate: "unknown", sampleRate: "unknown" }, quality: {warnings: ["failed to get extinf"]}
//       }
//   }
//   metadata.quality.warnings = metadata.quality.warnings.length //replace warnings array with just the number of warnings
//   //console.log("metadata: ",metadata)

//   let extrainfo = {}

//   var artist = metadata.common.artist == undefined ? "Unknown Artist" : metadata.common.artist
//   const title = metadata.common.title == undefined ? onlysong : metadata.common.title
//   const album = metadata.common.album == undefined ? "Unknown Album" : metadata.common.album
//   const duration = metadata.format.duration == undefined || parseInt(metadata.format.duration) < 1 ? "000001" : metadata.format.duration.toFixed(3).replaceAll(".","")

//   if (metadata.common.artists !== undefined && metadata.common.artists.length > 1) {
//       artist = metadata.common.artists.join(" / ")
//   }
//  if (fetchExtraInfo !== undefined && fetchExtraInfo === true) {
//       let lstat =  fs.lstatSync(song)
//       extrainfo.size = (lstat.size / 1000000).toFixed(2).toString() + " MB"
//       extrainfo.format = metadata.format.codec
//       extrainfo.bitrate = Math.round(metadata.format.bitrate / 1000).toString() + " kb/s"
//       extrainfo.samplerate = metadata.format.sampleRate.toString() + " Hz"

//       if (metadata.common.genre !== undefined && metadata.common.genre.length !== 0) {
//           extrainfo.genre = metadata.common.genre.join(" / ")
//       } else {
//           extrainfo.genre = "Unknown Genre"
//       }
//       extrainfo.year = metadata.common.year !== undefined ? metadata.common.year : "Unknown Year"
      

//       //console.log(extrainfo)
//  }
      

//   const extinf = `#EXTINF:${duration},${artist} - ${title}`

//   if (skipCovers == false) {
//       const pic = mm.selectCover(metadata.common.picture)
//       var cover = ""
//       if (pic !== undefined && pic !== null) {
//           let frmt = pic.format.replaceAll("image/", "")

//           cover = `data:${pic.format};base64,${pic.data.toString('base64')}`
//           coverobj = {frmt, "data": pic.data }
//       } else {
//           cover = ""
//           coverobj = false
//       }
//   }

//   //console.log(extinf)
//   if (returnObj == true) {
//       return {artist, title, album, duration, cover, extinf, coverobj, extrainfo}
//   } else {
//       return extinf
//   }
// }

// async function fetchAllSongs() {
//   //clear the playlists
//   allSongs = []
//   allPlaylists = []
//   songsAndPlaylists = []
//   editablePlaylists = []

//   //check for config com playlists if some are missing delete them
//   // for (let i = 0; i < Object.keys(config.comPlaylists).length; i++) {
//   //     const complaylist =Object.keys(config.comPlaylists)[i];
//   //     //console.log(complaylist)
//   //     if (!fs.existsSync(complaylist)) {
//   //         delete config.comPlaylists[complaylist]
//   //     }
//   // }

  
//   //read every song and add their tag to the big object
//   /*
//   for (let i = 0; i < songs.length; i++) {
//       const song = songs[i];
//       let tag = await mm.parseFile(song.fullpath, {"skipCovers": false, "duration": false})
//       if (tag.common.picture !== undefined) {
//           song.pic = tag.common.picture[0]
//       } 
//   }*/
//   if (songs.length > 0) {
//       //console.log(songs)
//       document.getElementById("command-line-input").removeAttribute("disabled")
//       genbutton.removeAttribute("disabled")

//       allSongs = songs

//       utils.clearFolder("./covers")
//       autocompArr == "both"
//       setupAutocomplete("song or playlist")
//   } else {
//       document.getElementById("input-placeholder").innerHTML = "No songs found in this folder, check settings"
//   }

//   //playlists
//   playlists = []
//   walk.filesSync(config.maindir, (basedir, filename) => {
//       let fp = basedir + slash + filename
//       playlists.push({ filename, "fullpath": fp, "relativepath": fp.replaceAll(config.maindir + slash, "")})
//   })
//   playlists = playlists.filter(playlist => {
//       let ext = utils.getExtOrFn(playlist.filename).ext
//       if (ext.toLowerCase() == "m3u" ) {
//           return true
//       } else {
//           return false
//       }
//   }).map(playlist => {
//       let lines = fs.readFileSync(playlist.fullpath, {"encoding": "utf-8"}).split("\n").filter(line => { if (line == "#EXTM3U" /*|| line.includes("#EXTINF:")*/) { return false } else { return true } })
//       //filter out extm3u stuff

//       playlist.songs = lines
//       playlist["type"] = "playlist"
//       playlist.tag = {
//           title: playlist.filename,
//           artist: `Playlist ${bull} ${playlist.songs.length / 2} Songs`,
//           album: utils.shortenFilename(playlist.fullpath, 60), 
//           cover: config.comPlaylists[playlist.fullpath] !== undefined ? "img/generated.png" : "img/playlist.png"
//       } 
//       return playlist
//   })
//   for (let i = 0; i < playlists.length; i++) {
//       const playlist = playlists[i];
//       playlist["index"] = i.toString()
//   }
//   allPlaylists = playlists
//   //console.log(playlists)

//   //combined
//   songsAndPlaylists = [...songs, ...playlists]
//   console.log(songsAndPlaylists)

//   //created playlists
//   editablePlaylists = fs.readdirSync(config.maindir).filter( //fetch teh maindir for user created playlists
//       item => fs.lstatSync(config.maindir + slash + item).isFile()
//   ).filter(item => { //filter out anything other than m3u
//       let ext = utils.getExtOrFn(item).ext
//       return ext.toLowerCase() == "m3u"
//   }).map(item => { //fetch the playlist data from big songAndPlaylists object
//       let fp = config.maindir + slash + item
//       let p = {}
//       for (let i = 0; i < songsAndPlaylists.length; i++) {
//           const cp = songsAndPlaylists[i];
//           if (cp.fullpath == fp) { p = cp; break; }
//       }
//   p.mode = config.comPlaylists[p.fullpath] !== undefined ? "com" : "new"
//       return p }
//   )
//   loadPlaylistsSidebar(editablePlaylists)
//   if (editablePlaylists.length > 0){document.getElementById("yourplaylistshr").style.display = "block"}

//   console.log(editablePlaylists)
// }






const context = {
	testdialog, initOrLoadConfig, pickFolder, saveConfig, slash, walker,
	getExtOrFn
}

export type IElectronAPI = typeof context;
contextBridge.exposeInMainWorld( "api", context );