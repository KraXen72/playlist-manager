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
import type { IConfig, ISongItem, ITag, ITagDB, ISongItemPlus } from './../global';

const isDevelopment = process.env.NODE_ENV === "development";
const slash = process.platform === 'win32' ? "\\" : "/"
const pslash = "/"

if (!fs.existsSync("./db")) {fs.mkdirSync("./db")}
if (!fs.existsSync("./db/covers")) {fs.mkdirSync("./db/covers")}


// electron stuff

/**
 * streamlined electron dialog api. only reveals needed dialog functions, not the entire module.
 */
const dialogApi = {
  /**
   * show a OpenDialog to pick a folder
   * @param title dialog window title
   * @returns folder path or null
   */
  pickFolder: (title: string) => {
    let opts: OpenDialogSyncOptions = {
      title, properties: ["openDirectory"]
    }
  
    let pick = dialog.showOpenDialogSync(opts)
    return pick
  },
  /**
   * show a plain information dialog with an ok button.
   * alternative to built-in alert. (don't use alert, it freezes the app)
   * @param text the message to show
   */
  infodialog: (text: string) => {
    dialog.showMessageBoxSync({message: text})
  },
  /**
   * show a confirmation dialog to confirm an action
   * @param question question/title to ask user
   * @param details details of the message
   * @returns true or false
   */
  confirmdialog: (question: string, details: string) => {
    let pick = dialog.showMessageBoxSync({
      title: question,
      message: question + "\n" + details,
      buttons: ["Yes", "No"],
      noLink: true
    })
    return pick === 0 ? true : false
  },
  /**
   * simple "confirm discard? dialog"
   */
  confirmDiscard: () => {
    const question = "Do you want to discard current playlist?"
    const details = "The current progress/changes will be lost."
    return dialogApi.confirmdialog(question, details)
  }
}

/**
 * read playlist and yeet first line
 * @param playlistPath path to playlist
 * @returns array of lines
 */
const readPlaylistForContent = (playlistPath: string, yeetExtinfs: Boolean) => {
  let content = fs.readFileSync(playlistPath, {"encoding": "utf-8"})
    .split("\n")
    .filter(line => { 
      if (line === "#EXTM3U" /*|| line.includes("#EXTINF:")*/) { return false } else { return true } 
    })
  if (yeetExtinfs) {
    return content.filter((l: string) => !l.includes("#EXTINF:"))
  } else {
    return content
  }
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
      return entry.dirent.isFile() && ext === "m3u" //if is a file and valid ext, it passes
    }).map((playlist, i) => {
      let lines = readPlaylistForContent(playlist.path, true)

      const sItem: PlaylistSongItem = {
       filename: playlist.name,
       fullpath: playlist.path,
       prettyName: getExtOrFn(playlist.name).fn, // this could just use song.name tbh
       index: indexOffset + i,
       relativepath: playlist.path.replaceAll(basedDir, "").replace(slash, ""),
       songs: lines,
       type: "playlist"
     }

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
        return ext.toLowerCase() === "m3u"
    })/*.map(item => { //fetch the playlist data from big songAndPlaylists object
        let fp = basedDir + slash + item
        let p = {}
        for (let i = 0; i < songsAndPlaylists.length; i++) {
            const cp = songsAndPlaylists[i];
            if (cp.fullpath === fp) { p = cp; break; }
        }
    p.mode = config.comPlaylists[p.fullpath] !== undefined ? "com" : "new"
        return p }
    )*/
    return editablePlaylists
  },
  validate: (paths: string[]) => {
    const statuses: {path: string, status: boolean}[] = []
    paths.forEach(path => {
      statuses.push({path, status: fs.existsSync(path)})
    })
    return statuses
  }
}

/**
 * functions to manage the current playlist
 */
const currentPlaylist = {
  save: (currPlaylist: ISongItemPlus[], maindir: string, playlistName: string, playlistImg: any) => {
    if (playlistName && playlistName !== "") {
      const tagDB: ITagDB = JSON.parse(fs.readFileSync(`./db/${btoa(maindir)}.json`, 'utf-8'))
      let unWrapped: string[] = []
      unWrapped.push("#EXTM3U")
      for (let i = 0; i < currPlaylist.length; i++) {
          const song = currPlaylist[i];
          if (song.type === "song") {
              unWrapped.push(tagDB[song.filename].extinf)
              unWrapped.push(song.relativepath.replaceAll(slash, pslash))
          } else if (song.type === "playlist") {
              if (typeof song.songs === "undefined") {throw "playlist doesen't have any songs"}

              let parts = song.relativepath.split(slash)
              let relpath = parts
                .slice(0, parts.length-1) // remove the last one. e.g: corpse/corpse.m3u => corpse
                .join(pslash) // join them back into a path with forward slash
              //console.log({parts, relpath})

              for (let i = 0; i < song.songs.length; i++) {
                  const item = song.songs[i];
                  const fnparts = item.split(pslash)
                  let filename = fnparts[fnparts.length - 1]
                  const extinf = tagDB[filename]?.extinf ?? "$$failed to get extinf"
                  if (extinf === "$$failed to get extinf") {console.error(`${extinf} for ${filename}`)}
                  unWrapped.push(extinf)
                  unWrapped.push([relpath, item].join(pslash))
              }
          }
      }
      
      fs.writeFileSync(`${maindir}${slash}${playlistName}.m3u`, unWrapped.join("\n"), {encoding: "utf-8"})
      new Notification("playlist-manager", {
        body: `Your playlist has been saved to:\n${maindir}${slash}${playlistName}.m3u`,
        icon: playlistImg
      })
    } else {
      dialogApi.infodialog("Please name your playlist before saving")
    }
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
    if (useEXTINF === true) {
      //get extinf line about the song. consult database fist and only if it's undefined read the song
      let extinf = tagDB[filename]?.extinf ?? await getEXTINF(entry.path, filename, false, true, false)
      thisPlaylist.push(extinf)
      thisPlaylist.push(`${prependName}${filename}`)
    } else {
      thisPlaylist.push(`${prependName}${filename}`)
    }
  }

  //console.log(basedDir, thisPlaylist)
  let lines = thisPlaylist.join("\n")
  fs.writeFileSync(`${basedDir + slash + relativedir}.m3u`, lines)
}

/**
 * generate all playlists from folders given a $maindir
 * @param maindir maindir
 * @param blacklist any word that when included in the path, will skip the folder
 * @param config IConfig object
 * @returns true if all went well so you can use .then()
 */
async function gen(maindir: string, blacklist: string[], config: IConfig) {
  console.time("generated all songs in: ")
  //don't pass the big tagDB over contextBridge, read it ourselves in nodejs
  const tagDB: ITagDB = JSON.parse(fs.readFileSync(`./db/${btoa(maindir)}.json`, 'utf-8'))

  let alldirs = fsWalk.walkSync(maindir, {stats: true})
    .filter(entry => entry.dirent.isDirectory() && !blacklist.some(blWord => entry.path.includes(blWord)))
    .map(entry => ({filename: entry.name, fullpath: entry.path}))
  
  // we need normal for loop because .forEach doesen't like async
  for (let i = 0; i < alldirs.length; i++) {
      const dir = alldirs[i];
      await generateM3U(dir.fullpath, config, tagDB)
      //progress = `${i / alldirs.length * 100}%` //TODO proper progress tracking
  }
  console.timeEnd("generated all songs in: ")
  return true
};

function deleteGeneratedPlaylists(maindir: string, config: IConfig) {
  let ePlaylists = walker.editablePlaylists(maindir)

  let generatedPlaylists = fsWalk.walkSync(maindir, {stats: true})
    .filter(entry => entry.dirent.isFile() && getExtOrFn(entry.name).ext === "m3u") //only m3u files
    .filter(entry => !ePlaylists.includes(entry.name)) //exclude user made playlists
    .map(entry => ({filename: entry.name, fullpath: entry.path}))

  let pnames = generatedPlaylists.map(entry => getExtOrFn(entry.filename).fn)

  if (pnames.length > 0) {
    let pick = dialog.showMessageBoxSync({
      title: "Are you sure you want to delete generated playlists?",
      message: `Are you sure you want to delete generated playlists? \n\n ${pnames.join(", ")}`,
      buttons: ["Yes, delete", "No, keep"],
      noLink: true
    })
    if (pick === 0) {
      generatedPlaylists.forEach(playlist => {
        fs.unlinkSync(playlist.fullpath)
      })
      console.log("deleted all generated playlists")
    }
  } else {
    console.log("no playlists to delete")
  }
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
  let metadata: mm.IAudioMetadata
  try {
      metadata = await mm.parseFile(song, {"skipCovers": skipCovers, "duration": false})
  } catch (e) {
      console.error(song, e)
      //@ts-ignore when we get Error: EINVAL: invalid argument, read for certain songs, make a dummy extinf
      metadata = { 
          common: {}, format: { duration: 1, bitrate: "unknown", sampleRate: "unknown" }, quality: {warnings: ["$$failed to get extinf"]}
      }
  }

  //replace warnings array with just the number of warnings
  if (!metadata.quality.warnings.includes("$$failed to get extinf")) {
    metadata.quality.warnings = metadata.quality.warnings.length 
  } else {
    console.error("failed to get extinf for:", metadata)
  }
  
  let extrainfo: ExtraInfo | {} = {}

  var artist = metadata.common?.artist ?? "Unknown Artist"
  const title = metadata.common?.title ?? onlysong
  const album = metadata.common?.album ?? "Unknown Album"
  const duration = metadata.format.duration === undefined || parseInt(metadata.format.duration) < 1 ? "000001" : metadata.format.duration.toFixed(3).replaceAll(".","")

  // join artists by / for oto music to parse playlists correctly
  if (metadata.common.artists !== undefined && metadata.common.artists.length > 1) {
      artist = metadata.common.artists.join(" / ")
  }
  if (fetchExtraInfo !== undefined && fetchExtraInfo) {
        let lstat =  fs.lstatSync(song)
        extrainfo = {
          size: (lstat.size / 1000000).toFixed(2).toString() + " MB",
          format: metadata.format.codec,
          bitrate: Math.round(metadata?.format?.bitrate ?? 1000 / 1000).toString() + " kb/s",
          samplerate: metadata.format.sampleRate?.toString() + " Hz",
          genre: metadata.common?.genre?.join(" / ") ?? "Unknown Genre",
          year: metadata.common.year !== undefined ? metadata.common.year : "Unknown Year"
        }
        //console.log(extrainfo)
  }
  const extinf = `#EXTINF:${duration},${artist} - ${title}`
  let cover = ""
  let coverobj = <CoverObj|boolean>{}

  if (!skipCovers) {
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
  if (returnObj === true) {
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
              //@ts-ignore
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

  let lastUpdate = -1
  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    //@ts-ignore
    const tag: ITag = await getEXTINF(song.fullpath, song.filename, true, false, false)
    const percDone = Math.floor(i / (songs.length-1) * 100)
    
    if (percDone % 9 === 0 && percDone > lastUpdate) {
      window.postMessage({purpose: "cacheTagsProgress", value: percDone}, "*")
      lastUpdate = percDone
    }
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
  slash, initOrLoadConfig, saveConfig, //main
  dialogApi, currentPlaylist, walker, //apis
  tagSongs, cacheTags, getEXTINF, //tagging
  generateM3U, gen, deleteGeneratedPlaylists //generatiog
}


export type IElectronAPI = typeof context;
contextBridge.exposeInMainWorld( "api", context );