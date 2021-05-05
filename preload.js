// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

const electron = require('electron').remote
const dialog = electron.dialog
const fs = require('fs')

const utils = require('./utils.js')

const walk = require('fs-walk')
const mm = require('music-metadata');
const Autocomplete = require('@trevoreyre/autocomplete-js')

const slash = process.platform === 'win32' ? "\\" : "/"
const bull = `&#8226;`
const specialRegex = new RegExp("[^\x00-\x7F]", "gm")
var config = utils.initOrLoadConfig("./config.json")
console.log("config: ", config)

var allSongs = []
var allPlaylists = []
var currPlaylist = []
var songsAndPlaylists = []

var playlistName = "Untitled Playlist"
var lastPlaylistName = "" //so we don't have to prompt to save every time
var savePath = ""

var specialMode = false

/* ui and other handling */
window.addEventListener('DOMContentLoaded', () => {
    console.log("loaded")
    if (config.maindir !== "") {selectfolder(null, config)}

    document.getElementById("folder-open").addEventListener("click", selectfolder)
    document.getElementById('settings').addEventListener("click", initSettings)
    document.getElementById("gen").addEventListener("click",gen)
    document.getElementById('prg').addEventListener("click", purgePlaylists)
    document.getElementById('new').addEventListener("click", newPlaylist)
    document.getElementById('special').addEventListener("click", specialSearch)
    document.getElementById('cancel').addEventListener("click", discardPlaylist)
    document.getElementById('save').addEventListener("click", savePlaylistPrompt)

    document.addEventListener("keydown", (e) => { //make tab do the same thing as enter
        if(e.which == 9){
            let song = songsAndPlaylists[parseInt(e.target.value.replaceAll('<span index="', "").split('"')[0])] //get the song index from the index attribute
            autocompleteSubmit(song)
            e.target.focus()
        }
    })
})

//select main dir
async function selectfolder(mouseevent, inputconfig) {
    if (typeof inputconfig === "undefined") { //clicked on the pick button
        pick = await dialog.showOpenDialog({properties: ['openDirectory']})
        console.log(pick)
        if (pick.canceled == false) {
            //we need to reload the app when picking a new folder. this checks if user wants to proceed or not
            if (currPlaylist.length > 0) {
                let msgc = await dialog.showMessageBoxSync({
                    message: "selecting a new main directory clears your current playlist. do you wish to proceed?",
                    type: "question",
                    buttons: ["Discard playlist and Proceed", "Cancel"],
                    noLink: true
                })
                if (msgc == 0) {
                    config.maindir = pick.filePaths[0]
                    utils.saveConfig("./config.json", config)
                    window.location.reload()
                }
            } else { //if user didn't make a playlist then just reload without asking
                config.maindir = pick.filePaths[0]
                utils.saveConfig("./config.json", config)
                window.location.reload() 
            } 
        } 
    } else { //loaded from config
        config.maindir = inputconfig.maindir
        document.getElementById("selected-folder").innerText = utils.shortenFilename(config.maindir.toString(), 40)
        document.getElementById("gen").removeAttribute("disabled")
        document.getElementById("input-placeholder").innerHTML = "Getting all songs, plese wait..."
        fetchAllSongs()
    }
}

//autocomplete

//autocomplete
function setupAutocomplete() {
    mainsearch = new Autocomplete('#autocomplete', {
        search: input => {
          if (input.length < 1 && specialMode == false) { return [] }
          let res = songsAndPlaylists.filter(song => { //find matches
            return song.filename.toLowerCase().includes(input.toLowerCase()) //fuck regex we doin includes
          }
          ).filter(song => { //filter out things already in playlist to avoid duplicates
            for (let i = 0; i < currPlaylist.length; i++) {if (song.filename == currPlaylist[i].filename) {return false} };return true
          })
          if (specialMode == true) {
              res = res.filter(song => {
                const regex = new RegExp(`[^\\x00-\\x7F]`, 'gi');
                return song.filename.match(regex)
              })
          }
          //sort the results so playlists are on top
          res.sort((a, b) => { if (a.type == "playlist" && b.type == "song") { return -1 } else if (a.type == "song" && b.type == "playlist") { return 1 } else { return 0} })
          
          return specialMode == true ? res : res.slice(0, 10)
        },
        onUpdate: (results, selectedIndex) => { 
            if (selectedIndex > -1) { updatePreview(results[selectedIndex], false)} //update the song preview
        },
        onSubmit: result => { //final pick
            autocompleteSubmit(result)
        },
        autoSelect: true,
        getResultValue: result => {
            let fn = result.filename
            let splitarr = fn.split(".")
            let fix = splitarr.slice("0", "-1")
            let final = fix.join(".")

            return `<span index="${songsAndPlaylists.indexOf(result)}">${final}${result.type == "playlist" ? ` (Playlist)` : ""}</span>`
        } //show the filename in the result
      })  
}
//autocomplete onSubmit
function autocompleteSubmit(result) {
    updatePreview(result, false) //update preview
    document.getElementById("command-line-input").value = '' //clear the input
    addSong(result) //add the song to current playlist
}
//special serach
function specialSearch() {
    document.getElementById("special").classList.toggle("btn-active")
    specialMode = specialMode == true ? false : true
}

//preview
async function updatePreview(song, empty) { 
    let index = document.getElementById("song-preview").getAttribute("index")
    let type = document.getElementById("song-preview").getAttribute("type")
    let tag = {} //artist, title, album, duration, cover, extinf, coverobj
    let update = true //if we should update
    if (empty == false) {
        if (document.getElementById("song-preview").style.visibility == "hidden"){document.getElementById("song-preview").style.visibility = "visible"}
        if (song.index !== index || song.type !== type) {
            if (song.type == "song") {
                tag = await getEXTINF(song.fullpath, song.filename, true, false)
            }  else if (song.type == "playlist") {
                tag = {
                    title: song.filename,
                    artist: `Playlist ${bull} ${song.songs.length / 2} Songs`,
                    album: utils.shortenFilename(song.fullpath, 60), 
                    cover: "playlist.png"
                } 
            }
            song.tag = tag
            document.getElementById("song-preview").setAttribute("index", song.index.toString())
            document.getElementById("song-preview").setAttribute("type", song.type.toString())
            
        } else { //its the same song
            update = false
        }
        
    } else { tag = { artist: "", title: "", album: "", cover: "" } } //just clear the preview

    if (update == true) {
        document.getElementById("sp-cover").src = `${tag.cover}`
        document.getElementById("sp-title").textContent = tag.title
        document.getElementById("sp-artist").innerHTML = tag.artist
        document.getElementById("sp-album").textContent = tag.album
    }
}

//settings
function initSettings() {
    let body = document.getElementById("settings-body")
    //closeSettings()
    if (body.style.display !== "block") {
        body.style.display = "block"
        document.getElementById('settings-close').onclick = closeSettings
        document.getElementById("settings-submit").onclick = saveSettings

        fillSettingPills("settings-exts", config.exts)
        document.getElementById('settings-exts-add').onclick = () => {addPill('settings-exts', 'settings-exts-input')}
        
        fillSettingPills("settings-ign", config.ignore)
        document.getElementById('settings-ign-add').onclick = () => {addPill('settings-ign', 'settings-ign-input')}
        document.getElementById('settings-ign-pick').onclick = () => {pickFolderAndFillInput('settings-ign-input')}

    }
}
function closeSettings() {
    document.getElementById("settings-body").style.display = "none"
}
function saveSettings() {
    config.exts = [...document.getElementById("settings-exts").querySelectorAll(".pillval")].map(pill => pill.innerText)
    config.ignore = [...document.getElementById("settings-ign").querySelectorAll(".pillval")].map(pill => pill.innerText)
    
    utils.saveConfig("./config.json", config)
}

//settings pills
//add a pill to wrapper
function addPill(wrapperid, inputid) {
    add = document.getElementById(inputid).value
    if (document.getElementById(wrapperid).innerText == "Nothing found"){document.getElementById(wrapperid).innerHTML = ""} //clear the nothing found
    if (add !== "") {
        document.getElementById(wrapperid).innerHTML += 
    `<div class="pill"><span class="pillval">${add}</span><button class="closepill" onclick="this.parentElement.remove()">&times;</button></div>`
    document.getElementById(inputid).value = ""
    }
    
}
//fill a wrapper with pills from an array
function fillSettingPills(wrapperid, settingarr) {
    document.getElementById(wrapperid).innerHTML = ""
    if (settingarr.length > 0) {
        for (let i = 0; i < settingarr.length; i++) {
            document.getElementById(wrapperid).innerHTML +=
        `<div class="pill"><span class="pillval">${settingarr[i]}</span><button class="closepill" onclick="this.parentElement.remove()">&times;</button></div>` 
        }
    } else {
        document.getElementById(wrapperid).innerHTML = `Nothing found`
    }
}
//pick a folder using electron dialog and then add the folder name to the #${inputid} input
async function pickFolderAndFillInput(inputid) {
    pick = await dialog.showOpenDialog({properties: ['openDirectory']})
    console.log(pick)
    if (pick.canceled == false) {
        let fullpath = pick.filePaths[0]
        let splitarr = fullpath.split(slash)
        document.getElementById(inputid).value = splitarr[splitarr.length - 1]
    }
    
}

/*playlist handling*/

/*new playlist*/

function newPlaylist() {
    let newbtn = document.getElementById("new")
    let titleh = document.getElementById("titleh")
    let inp = document.getElementById("playlist-name-input")
    let sub = document.getElementById("playlist-name-submit")
    let canc = document.getElementById("playlist-name-cancel")
    let wrap = document.getElementById("playlist-name-wrapper")

    wrap.style.display = "block"
    sub.style.display = "flex"
    canc.style.display = "flex"
    newbtn.style.display = "none"
    titleh.style.display = "none"
    inp.focus()

    sub.onclick = () => {
        if (inp.value.replaceAll(" ", "") !== "") {
            playlistName = inp.value

            sub.style.display = "none"
            canc.style.display = "none"
            titleh.style.display = "block"
            wrap.style.display = "none"
            sub.onclick = ""
            canc.onclick = ""
            titleh.textContent = playlistName
            newbtn.style.display = "flex"

        }
    }
    canc.onclick = () => {
        sub.style.display = "none"
        canc.style.display = "none"
        titleh.style.display = "block"
        wrap.style.display = "none"
        sub.onclick = ""
        canc.onclick = ""
        newbtn.style.display = "flex"
    }
}

function discardPlaylist() {
    if (currPlaylist.length > 0) {
        document.getElementById("command-line-input").blur()
        let con = dialog.showMessageBoxSync({
            message: "do you wish to discard current playlist?",
            type: "question",
            buttons: ["Discard playlist", "Cancel"],
            noLink: true
        })
        if (con == 0) {
            utils.clearFolder("./covers")
            document.getElementById("playlist-bar").innerHTML = ""
            currPlaylist = []
            document.getElementById("song-preview").style.visibility = "hidden"
        }
    }
}

function savePlaylistPrompt() {
    if (currPlaylist.length > 0) {
        if (playlistName == "Untitled Playlist") {
            dialog.showMessageBoxSync({"message": "Please name your playlist first"})
        } else {
            let opts = {
                title: "Save Playlist",
                defaultPath: `${config.maindir + slash + playlistName}.m3u`,
                buttonLabel : "Save Playlist",
                filters :[{name: 'Playlist', extensions: ['m3u']}]

            }
            if (playlistName == lastPlaylistName && savePath !== undefined) {
                savePlaylist()
            } else {
                savePath = dialog.showSaveDialogSync(opts)
                if (savePath !== undefined) { lastPlaylistName = playlistName; savePlaylist() }
            }
        }
    }
}

function savePlaylist() { //actually save the playlist
    let lines = getPlaylistContent()
    fs.writeFileSync(savePath, lines.join("\n"))
    
    document.getElementById("save").classList.add("btn-active")
    setTimeout(() => {document.getElementById("save").classList.remove("btn-active")}, 1000)
}

function getPlaylistContent() {
    let play = []
    play.push("#EXTM3U")
    for (let i = 0; i < currPlaylist.length; i++) {
        const song = currPlaylist[i];
        if (song.type == "song") {
            play.push(song.tag.extinf)
            play.push(song.relativepath)
        } else if (song.type == "playlist") {
            let spl = song.relativepath.split(slash)
            let relpath = spl.slice(0, spl.length-1).join(slash)
            console.log(relpath)

            for (let i = 0; i < song.songs.length; i++) {
                const item = song.songs[i];
                if (item.includes("#EXTINF")) {
                    play.push(item)
                } else {
                    play.push([relpath, item].join(slash))
                }
            }
        }
    }
    return play
}

async function addSong(songobj) {
    let tag = songobj.tag

    let songElem = document.createElement("div")
    let remElem = document.createElement("div")
    let id = Date.now().toString() 

    if (tag.coverobj !== false && songobj.type == "song") {
        fs.writeFileSync(`covers${slash}cover-${id}.${tag.coverobj.frmt}`, tag.coverobj.data)
    }
    let imgpath = ""
    if (songobj.type == "song") {
        imgpath = `covers/cover-${id}.${tag.coverobj !== false ? tag.coverobj.frmt : "png"}`
    } else if (songobj.type == "playlist") {
        imgpath = "playlist.png"
    }

    songElem.className = "songitem"
    songElem.innerHTML = `
    <div class="songitem-cover-wrap">
        <div class="songitem-cover-placeholder"></div>
        <img class="songitem-cover cover-${id}" draggable="false" src="${imgpath}" onerror = "this.src = 'placeholder.png'"></img>
    </div>
    <div class="songitem-title" title="${utils.fixQuotes(tag.title)}">${tag.title}</div>
    <div class="songitem-aa">
        <span class="songitem-artist" title="${utils.fixQuotes(tag.artist)}">${tag.artist}</span>&nbsp;&#8226;&nbsp;<span class = "songitem-album" title="${utils.fixQuotes(tag.album)}">${tag.album}</span>
    </div>
    <div class="songitem-filename" hidden>${songobj.filename}</div>
    `
    songElem.setAttribute("index", songobj.index.toString())

    remElem.classList.add("songitem-remove")
    remElem.innerHTML = `<i class="material-icons-round md-close"></i>`
    remElem.onclick = () => {
        if (currPlaylist.length == 1) { document.getElementById("song-preview").style.visibility = "hidden" }
        for (let i = 0; i < currPlaylist.length; i++) {
            const song = currPlaylist[i];
            if (songobj.fullpath == song.fullpath) {
                currPlaylist.splice(i, 1)
                break;
            }
        }
        if (songobj.type == "song"){fs.unlinkSync(`covers${slash}cover-${id}.${tag.coverobj.frmt}`)}
        songElem.remove()
    }
    if (songobj.type == "playlist") { //add a print
        remElem.style.gridColumn = " 4 / 5"

        let printElem = document.createElement("div")
        printElem.classList.add("songitem-remove")
        printElem.innerHTML = `<i class="material-icons-round md-queue_music"></i>`
        printElem.onclick = () => {
            dialog.showMessageBoxSync({
                message: `This playlist contains:\n${songobj.songs.filter(line => !line.includes("#EXTINF")).join("\n")}`,
                type: "info",
                noLink: true
            })

        }

        songElem.appendChild(printElem)

    }

    songElem.appendChild(remElem)
    document.getElementById("playlist-bar").appendChild(songElem)

    //this briefly selects the image to update it because some images are wierd and don't render on their own
    setTimeout(() => {
        document.getElementById("command-line-input").blur()
        var s = window.getSelection()
        var r = document.createRange();
        s.removeAllRanges()
        r.selectNode(songElem.querySelector(".songitem-cover-wrap"));
        s.addRange(r)
        
        setTimeout(() => {s.removeAllRanges();setTimeout(() => {document.getElementById("command-line-input").focus()}, 3)}, 10)
    }, 2)
    
    if (songobj.type == "song") {
        songobj.tag.cover = ""
        songobj.tag.coverobj.data = ""
    }

    currPlaylist.push(songobj)
    console.log(currPlaylist)
}

/*playlist handling - file manipulation etc*/

//walk all directories and then call generateM3U()
async function gen() {
    let alldirs = []
    let genbutton = document.getElementById("gen")
    genbutton.setAttribute("disabled","true")

    walk.dirsSync(config.maindir, (basedir, filename, stats) => {
        alldirs.push({basedir, filename, "fullpath": basedir + slash + filename, stats})
    })
    if (config.ignore.length > 0) { //if there are some folders to ignore, then filter out the folders
        alldirs = alldirs.filter(dir => {
           for (let i = 0; i < config.ignore.length; i++) { //traditional for loop so i can return out of filter and not forEach
               const word = config.ignore[i];
               if (dir.fullpath.includes(word)) { //if the full path includes the blacklisted word, filter the dir out.
                   return false
               }
           }
           return true
        })
    }
    //console.log(alldirs)

    for (let i = 0; i < alldirs.length; i++) {
        const dir = alldirs[i];
        await generateM3U(dir.fullpath, true)
    }
    //await generateM3U(alldirs[22].fullpath, true)
    console.log("done")
    genbutton.removeAttribute("disabled")
    genbutton.classList.add("btn-active")
    setTimeout(() => { genbutton.classList.remove("btn-active") }, 1000)
}

//generate a m3u for given folder
async function generateM3U(folder, useEXTINF) {
    const allsongs = []

    if (useEXTINF) {allsongs.push("#EXTM3U")}
    let relativedir = folder.split(slash)
    relativedir = relativedir[relativedir.length -1]
    let appendname = ""
    //console.log(relativedir)

    let walksongs = []

    //find all songs in the folder
    walk.filesSync(folder, (basedir, filename) => {
        walksongs.push({basedir, filename})
    })
    //loop through all of them
    for (let i = 0; i < walksongs.length; i++) {
        const walksong = walksongs[i];
        let filename = walksong.filename
        let basedir = walksong.basedir

        song = filename
        extarr = song.split(".")
        if (basedir.replace(folder).length > 0) { //stupid fucking piece of shit
            appendname = basedir.replace(folder, "").replace(slash, "")
            if (appendname.length > 0) {appendname += slash}
        }
        //if the song extension is in allowed list
        if (config.exts.includes(extarr[extarr.length - 1])) {
            if (useEXTINF == true) {
                //get info about the song
                let extinf = await getEXTINF(basedir + slash + song, song, false, true)
                allsongs.push(extinf.toString())
                allsongs.push(`${appendname}${filename}`)
            } else {
                allsongs.push(`${appendname}${filename}`)
            }
        }
    }
    //console.log(allsongs)
    let lines = allsongs.join("\n")
    //console.log(lines)

    fs.writeFileSync(`${folder + slash + relativedir}.m3u`, lines)
}

//read the file and get it's metadata
async function getEXTINF(song, onlysong, returnObj, skipCovers) {
    const metadata = await mm.parseFile(song, {"skipCovers": skipCovers, "duration": false})
    metadata.quality.warnings = metadata.quality.warnings.length //replace warnings array with just the number fo warnings
    //console.log("metadata: ",metadata)

    const artist = metadata.common.artist == undefined ? "Unknown Artist" : metadata.common.artist
    const title = metadata.common.title == undefined ? onlysong : metadata.common.title
    const album = metadata.common.album == undefined ? "Unknown Album" : metadata.common.album
    const duration = metadata.format.duration == undefined || parseInt(metadata.format.duration) < 1 ? "000001" : metadata.format.duration.toFixed(3).replaceAll(".","")
    const extinf = `#EXTINF:${duration},${artist} - ${title}`

    if (skipCovers == false) {
        const pic = mm.selectCover(metadata.common.picture)
        var cover = ""
        if (pic !== undefined && pic !== null) {
            let frmt = pic.format.replaceAll("image/", "")

            cover = `data:${pic.format};base64,${pic.data.toString('base64')}`
            coverobj = {frmt, "data": pic.data }
        } else {
            cover = ""
            coverobj = false
        }
    }

    //console.log(extinf)
    if (returnObj == true) {
        return {artist, title, album, duration, cover, extinf, coverobj}
    } else {
        return extinf
    }
}

async function fetchAllSongs() {
    let genbutton = document.getElementById("gen")
    genbutton.setAttribute("disabled", "true")
    let songs = []
    walk.filesSync(config.maindir, (basedir, filename) => {
        let fp = basedir + slash + filename
        songs.push({ filename, "fullpath": fp, "relativepath": fp.replaceAll(config.maindir + slash, "")})
    })
    songs = songs.filter(song => {
        let splitarr = song.filename.split(".")
        let ext = splitarr[splitarr.length - 1]
        if (config.exts.includes(ext.toLowerCase()) ) {
            song["type"] = "song"
            return true
        } else {
            return false
        }
    })
    for (let i = 0; i < songs.length; i++) {
        const song = songs[i];
        song["index"] = i.toString() 
    }
    //read every song and add their tag to the big object
    /*
    for (let i = 0; i < songs.length; i++) {
        const song = songs[i];
        let tag = await mm.parseFile(song.fullpath, {"skipCovers": false, "duration": false})
        if (tag.common.picture !== undefined) {
            song.pic = tag.common.picture[0]
        } 
    }*/
    if (songs.length > 0) {
        console.log(songs)
        document.getElementById("command-line-input").removeAttribute("disabled")
        document.getElementById("input-placeholder").innerHTML = "Start typing a name of a song..."
        genbutton.removeAttribute("disabled")

        allSongs = songs

        utils.clearFolder("./covers")
        setupAutocomplete()
    } else {
        document.getElementById("input-placeholder").innerHTML = "No songs found in this folder, check settings"
    }

    //playlists
    let playlists = []
    walk.filesSync(config.maindir, (basedir, filename) => {
        let fp = basedir + slash + filename
        playlists.push({ filename, "fullpath": fp, "relativepath": fp.replaceAll(config.maindir + slash, "")})
    })
    playlists = playlists.filter(playlist => {
        let splitarr = playlist.filename.split(".")
        let ext = splitarr[splitarr.length - 1]
        if (ext.toLowerCase() == "m3u" ) {
            return true
        } else {
            return false
        }
    }).map(playlist => {
        let lines = fs.readFileSync(playlist.fullpath, {"encoding": "utf-8"}).split("\n").filter(line => { if (line == "#EXTM3U" /*|| line.includes("#EXTINF:")*/) { return false } else { return true } })
        //filter out extm3u stuff

        playlist.songs = lines
        playlist["type"] = "playlist"
        return playlist
    })
    for (let i = 0; i < playlists.length; i++) {
        const playlist = playlists[i];
        playlist["index"] = i.toString()
    }
    allPlaylists = playlists
    //console.log(playlists)

    //combined
    songsAndPlaylists = [...songs, ...playlists]
    console.log(songsAndPlaylists)
}

//delete all generated playlists
function purgePlaylists() {
    let playlists = []

    walk.filesSync(config.maindir, (basedir, filename) => {
        playlists.push({ filename, "fullpath": basedir + slash + filename})
    })
    playlists = playlists.filter(playlist => {
        let splitarr = playlist.filename.split(".")
        let ext = splitarr[splitarr.length - 1]
        if (ext.toLowerCase() === "m3u" ) {
            return true
        } else {
            return false
        }
    })
    if (playlists.length > 0) {
        //console.log(playlists)

        let playliststr = playlists.map(playlist => playlist.filename).join(", ")
        let prgbtn = document.getElementById("prg")

        let message = `Are you sure you want to delete all these playlists?
        ${playliststr}`

        let decision = window.confirm(message)
        if (decision == true) {
            let delpaths = playlists.map(p => p.fullpath)
            delpaths.forEach(p => {
                fs.unlinkSync(p, (err) => console.log(err))
            })
            console.log("deleted sucessfully")
            prgbtn.classList.add("btn-active")
            setTimeout(() => {prgbtn.classList.remove("btn-active")}, 1000)
        } else (
            console.log("cancelled deleting")
        )
    } else {
        alert("no playlists found, nothing deleted.")
    }

   
}