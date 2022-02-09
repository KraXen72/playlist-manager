//import { allSongs, allPlaylists, allSongsAndPlaylists, config } from './../frontend/common/stores';
// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
import { dialog, shell } from '@electron/remote'
import { contextBridge, ipcRenderer, OpenDialogSyncOptions } from "electron";

import * as fsWalk from '@nodelib/fs.walk';
import * as path from 'path';
import * as mm from 'music-metadata';
import * as fs from 'fs';

import { initOrLoadConfig, saveConfig, getExtOrFn } from '../rblib/utils.js'

//we don't need to know about config if we just pass the values from svelte here
//import { config } from './../frontend/common/stores'
import type { IConfig, ISongItem, ITag, ITagDB } from './../global';

const isDevelopment = process.env.NODE_ENV === "development";
const slash = process.platform === 'win32' ? "\\" : "/"
const pslash = "/"

if (!fs.existsSync("./db")) {fs.mkdirSync("./db")}
if (!fs.existsSync("./db/covers")) {fs.mkdirSync("./db/covers")}

const infodialog = (text: string) => {
  dialog.showMessageBoxSync({message: text})
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

/**
 * read playlist and yeet first line
 * @param playlistPath path to playlist
 * @returns array of lines
 */
const readPlaylistForContent = (playlistPath: string) => {
  return fs.readFileSync(playlistPath, {"encoding": "utf-8"}
  ).split("\n"
  ).filter(line => { 
    if (line == "#EXTM3U" /*|| line.includes("#EXTINF:")*/) { return false } else { return true } 
  })
}

/**
 * object with multiple methods for walking/reading the filesystem for playlits and songs
 */
const walker = {
  /**
   * recursively walk $maindir to find all songs. only takes around 70ms
   * @param basedDir maindir
   * @param config config (used to get valid extensions)
   * @returns array of SongItem objects
   */
  songs: (basedDir: string, config: IConfig) => {
    let songs = fsWalk.walkSync(basedDir, {stats: true}).filter(entry => {

      let ext = path.extname(entry.name).replaceAll(" ", "").replace(".", "") //strip spaces and dot from ext
      return entry.dirent.isFile() && config.exts.includes(ext) //if is a file and valid ext, it passes

    }).map((song, i) => {
      const parts = song.name.split(slash)

      const sItem: ISongItem = {
    	 	filename: song.name,
        fullpath: song.path,
        prettyName: getExtOrFn(parts[parts.length - 1]).fn, // this could just use song.name tbh
        index: i,
        relativepath: song.path.replaceAll(basedDir, "").replace(slash, ""),
        type: "song"
      }
      //ipcRenderer.send("tagProgress", "done")
      return sItem
    })
    return songs
  },
  /**
   * recursively walk $maindir to find all playlists
   * @param basedDir maindir
   * @param indexOffset $allSongs.length
   * @returns array of SongItem objects
   */
  playlists: (basedDir: string, indexOffset: number) => {
    let playlists = fsWalk.walkSync(basedDir, {stats: true}
    ).filter(entry => {
      let ext = path.extname(entry.name).replaceAll(" ", "").replace(".", "") //strip spaces and dot from ext
      return entry.dirent.isFile() && ext == "m3u" //if is a file and valid ext, it passes
    }).map((playlist, i) => {
      let lines = readPlaylistForContent(playlist.path)

      const sItem: PlaylistSongItem = {
       filename: playlist.name,
       fullpath: playlist.path,
       prettyName: getExtOrFn(playlist.name).fn, // this could just use song.name tbh
       index: indexOffset + i,
       relativepath: playlist.path.replaceAll(basedDir, "").replace(slash, ""),
       songs: lines,
       type: "playlist"
     }
     //TODO read file for contents

      return sItem
    })
    return playlists
  },
  /**
   * read the $maindir for all playlists created by user
   * @param basedDir maindir
   * @returns array of filenames of user-created playlists
   */
  editablePlaylists: (basedDir: string) => {
    let editablePlaylists = fs.readdirSync(basedDir
    ).filter( //fetch the maindir for user created playlists
        item => fs.lstatSync(basedDir + slash + item).isFile()
    ).filter(item => { //filter out anything other than m3u
        let ext = getExtOrFn(item).ext
        return ext.toLowerCase() == "m3u"
    })/*.map(item => { //fetch the playlist data from big songAndPlaylists object
        let fp = basedDir + slash + item
        let p = {}
        for (let i = 0; i < songsAndPlaylists.length; i++) {
            const cp = songsAndPlaylists[i];
            if (cp.fullpath == fp) { p = cp; break; }
        }
    p.mode = config.comPlaylists[p.fullpath] !== undefined ? "com" : "new"
        return p }
    )*/
    return editablePlaylists
  }
}

async function generateM3U(basedDir: string, config: IConfig, tagDB: ITagDB) {
  let useEXTINF = true // you could overrite this to disable extinf's probably
  let thisPlaylist: string[] = []

  let relativedir: string | string[] = basedDir.split(slash)
  relativedir = relativedir[relativedir.length -1]

  //find all songs in the folder
  let walkSongs = fsWalk.walkSync(basedDir, {stats: true}).filter(entry => {
    let ext = path.extname(entry.name).replaceAll(" ", "").replace(".", "") //strip spaces and dot from ext
    return entry.dirent.isFile() && config.exts.includes(ext) //if is a file and valid ext, it passes
  })
  if (useEXTINF) {thisPlaylist.push("#EXTM3U")}
  for (let i = 0; i < walkSongs.length; i++) {
    const entry = walkSongs[i];
    const filename = entry.name
    let fullpath = entry.path

    //if there are subfolders, they have to be prepended.
    //D:\\music\\sleep token\\Sleep Token - This Place Will Become Your Tomb\\08 - Distraction.mp3
    //can be represented as: ??basedDir\\{prepend name}\\??filename 
    //then split and cleaned up to get the prependName, Sleep Token - This Place Will Become Your Tomb
    let prependName = fullpath
      .replace(filename, "??filename")
      .replace(basedDir, "??basedDir")
      .split(slash)
      .filter(part => !["??basedDir", "??filename"].includes(part))
      .join(pslash)
    if (prependName.length > 0) {prependName += pslash}
    
    //if the song extension is in allowed list
    if (useEXTINF == true) {
      //get extinf line about the song. consult database fist and only if it's undefined read the song
      let extinf = tagDB[filename]?.extinf ?? await getEXTINF(entry.path, filename, false, true, false)
      thisPlaylist.push(extinf)
      thisPlaylist.push(`${prependName}${filename}`)
    } else {
      thisPlaylist.push(`${prependName}${filename}`)
    }
  }

  console.log(thisPlaylist)
  let lines = thisPlaylist.join("\n")
  //fs.writeFileSync(`${basedDir + slash + relativedir}.m3u`, lines)
}


//read the file and get it's metadata
/**
 * read song file to get metadata
 * @param song full path to file
 * @param onlysong relative path to file (no folder)
 * @param returnObj if true, return full object instead of EXTINF string
 * @param skipCovers if true, skip fetching covers (faster)
 * @param fetchExtraInfo if true, fetch extra info
 */
 async function getEXTINF(song: string, onlysong: string, returnObj: boolean, skipCovers: boolean, fetchExtraInfo: boolean) {
  var metadata
  try {
      metadata = await mm.parseFile(song, {"skipCovers": skipCovers, "duration": false})
  } catch (e) {
      console.warn(song, e)
      metadata = { //when we get Error: EINVAL: invalid argument, read for certain songs, make a dummy extinf
          common: {}, format: { duration: 1, bitrate: "unknown", sampleRate: "unknown" }, quality: {warnings: ["failed to get extinf"]}
      }
  }
  //@ts-ignore
  metadata.quality.warnings = metadata.quality.warnings.length //replace warnings array with just the number of warnings

  //console.log("metadata: ",metadata)

  let extrainfo: ExtraInfo | {} = {}

  var artist = metadata.common?.artist ?? "Unknown Artist"
  const title = metadata.common?.title ?? onlysong
  const album = metadata.common?.album ?? "Unknown Album"
  const duration = metadata.format.duration == undefined || parseInt(metadata.format.duration) < 1 ? "000001" : metadata.format.duration.toFixed(3).replaceAll(".","")

  if (metadata.common.artists !== undefined && metadata.common.artists.length > 1) {
      artist = metadata.common.artists.join(" / ")
  }
  if (fetchExtraInfo !== undefined && fetchExtraInfo === true) {
        let lstat =  fs.lstatSync(song)
        extrainfo = {
          size: (lstat.size / 1000000).toFixed(2).toString() + " MB",
          format: metadata.format.codec,
          bitrate: Math.round(metadata.format.bitrate / 1000).toString() + " kb/s",
          samplerate: metadata.format.sampleRate?.toString() + " Hz",
          genre: metadata.common?.genre?.join(" / ") ?? "Unknown Genre",
          year: metadata.common.year !== undefined ? metadata.common.year : "Unknown Year"
        }
        //console.log(extrainfo)
  }
  const extinf = `#EXTINF:${duration},${artist} - ${title}`
  let cover = ""
  let coverobj = <CoverObj|boolean>{}

  if (skipCovers == false) {
      const pic = mm.selectCover(metadata.common.picture)
      if (pic !== undefined && pic !== null) {
          let frmt = <"jpeg"|"png">pic.format.replaceAll("image/", "")

          cover = `data:${pic.format};base64,${pic.data.toString('base64')}`
          coverobj = {frmt, "data": pic.data }
      } else {
          cover = ""
          coverobj = false
      }
  }

  //console.log(extinf)
  if (returnObj == true) {
      return {artist, title, album, duration, cover, extinf, coverobj, extrainfo}
  } else {
      return extinf
  }
  //TODO split this into two functions where one returns object and one returns string
}

async function tagSongs(allSongs: SongItem[]) {
  const tags = []
  for (let i = 0; i < allSongs.length; i++) {
      const song = allSongs[i];
      tags.push(
          new Promise(async (resolve) => {
              const tag = await getEXTINF(song.fullpath, song.filename, true, false, false)
              allSongs[song.index].tag = tag
              resolve("")
          })
      )
  }
  await Promise.all(tags)
  return allSongs
}

/**
 * fetch tags for allSongs (provided). save covers as files
 * @param songs array of songs to fetch tags for. preferably allSongs
 */
async function cacheTags(songs: SongItem[]) {
  let tags = {}
  let buffers = {}
  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    //@ts-ignore
    const tag: ITag = await getEXTINF(song.fullpath, song.filename, true, false, false)
    //console.log("fetched")

    let coverpath = ''
    let publicCoverPath = ''
    if (tag.coverobj !== false) {
      coverpath = `./db/covers/${song.prettyName}.${tag.coverobj.frmt}`
      publicCoverPath = `/covers/${song.prettyName}.${tag.coverobj.frmt}`

      buffers[song.prettyName] = tag.coverobj.data // add raw image data into the buffers array
      fs.writeFileSync(coverpath, buffers[song.prettyName]) //write cover to file
      delete buffers[song.prettyName] //delete buffer after write
      
      tag.coverobj = false; //exterminatus
    }
    //tag.coverobj = false
    tag.fallbackCoverPath = coverpath
    tag.cover = publicCoverPath
    //@ts-ignore
    tags[song.filename] = tag
    
  }
  return tags
}

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
  /*send: (channel: string, data: any) => {
    // whitelist channels
    let validChannels = ["toMain", "requestSystemInfo"];
    if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
    }
  },*/
  /*
  on: (channel: string, func: (arg0: any) => void) => {
      let validChannels = ["fromMain", "getSystemInfo", 'tagProgress'];
      if (validChannels.includes(channel)) {
          // Deliberately strip event as it includes `sender`
          // @ts-ignore
          ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
  },*/
  slash, infodialog, initOrLoadConfig, pickFolder, saveConfig,  walker, getEXTINF, tagSongs, cacheTags, generateM3U
}

export type IElectronAPI = typeof context;
contextBridge.exposeInMainWorld( "api", context );