//import { allSongs, allPlaylists, allSongsAndPlaylists, config } from './../frontend/common/stores';
// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
import { dialog, shell } from '@electron/remote'
import { contextBridge, ipcRenderer, OpenDialogSyncOptions } from "electron";
import * as fsWalk from '@nodelib/fs.walk';
import * as path from 'path';

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
      const sItem: ISongItem = {
    	 	filename: song.name,
        fullpath: song.path,
        index: i,
        relativepath: song.path.replaceAll(basedDir, "").replace(slash, ""),
        type: "song"
      }
      return sItem
    })
    return songs
  }
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
  },
  on: (channel: string, func: (arg0: any) => void) => {
      let validChannels = ["fromMain", "getSystemInfo"];
      if (validChannels.includes(channel)) {
          // Deliberately strip event as it includes `sender`
          // @ts-ignore
          ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
  },*/ 
	testdialog, initOrLoadConfig, pickFolder, saveConfig, slash, walker,
	getExtOrFn
}

export type IElectronAPI = typeof context;
contextBridge.exposeInMainWorld( "api", context );