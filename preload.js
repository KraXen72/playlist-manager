// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

const electron = require('electron').remote
const dialog = electron.dialog
const fs = require('fs')

const utils = require('./utils.js')

const walk = require('fs-walk')
const mm = require('music-metadata');
const Autocomplete = require('@trevoreyre/autocomplete-js')

var slash = process.platform === 'win32' ? "\\" : "/"
var config = utils.initOrLoadConfig("./config.json")
console.log("config: ", config)

var allSongs = []

/* ui and other handling */
window.addEventListener('DOMContentLoaded', () => {
    console.log("loaded")
    if (config.maindir !== "") {selectfolder(null, config)}

    document.getElementById("folder-open").addEventListener("click", selectfolder)
    document.getElementById("gen").addEventListener("click",gen)
    document.getElementById('settings').addEventListener("click", initSettings)
    document.getElementById('prg').addEventListener("click", purgePlaylists)
})

//select main dir
async function selectfolder(mouseevent, inputconfig) {
    if (typeof inputconfig === "undefined") { //clicked on the pick button
        pick = await dialog.showOpenDialog({properties: ['openDirectory']})
        console.log(pick)
        if (pick.canceled == false) {
            console.log("didn't cancel")
            config.maindir = pick.filePaths[0]
            utils.saveConfig("./config.json", config)
        }
    } else { //loaded from config
        config.maindir = inputconfig.maindir
    }

    document.getElementById("selected-folder").innerText = utils.shortenFilename(config.maindir.toString(), 40)
    document.getElementById("gen").removeAttribute("disabled")
    document.getElementById("input-placeholder").innerHTML = "Getting all songs, plese wait..."

    fetchAllSongs()
}

//autocomplete
function setupAutocomplete() {
    new Autocomplete('#autocomplete', {
        search: input => {
          if (input.length < 1) { return [] }
          return allSongs.filter(song => {
            const regex = RegExp(input, 'gi');
            return song.filename.match(regex)
          }).slice(0, 10).map(song => song.filename)
        }
      })  
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
    console.log(alldirs)

    for (let i = 0; i < alldirs.length; i++) {
        const dir = alldirs[i];
        await generateM3U(dir.fullpath, true)
    }
    //await generateM3U(alldirs[22].fullpath, true)
    console.log("done")
    genbutton.removeAttribute("disabled")
    genbutton.style.color = "green"
    setTimeout(() => {
        genbutton.style.color = ""

    }, 1000)
}

//generate a m3u for given folder
async function generateM3U(folder, useEXTINF) {
    const allsongs = []
    if (useEXTINF) {allsongs.push("#EXTM3U")}
    let relativedir = folder.split(slash)
    relativedir = relativedir[relativedir.length -1]

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
        //if the song extension is in allowed list
        if (config.exts.includes(extarr[extarr.length - 1])) {   
            if (useEXTINF == true) {
                //get info about the song
                let extinf = await getEXTINF(basedir + slash + song, song)
                allsongs.push(extinf.toString())
                allsongs.push(filename.toString())
            } else {
                allsongs.push(filename.toString())
            }
        }
    }

    //console.log(allsongs)
    let lines = allsongs.join("\n")

    fs.writeFileSync(`${folder + slash + relativedir}.m3u`, lines)
}

//read the file and get it's metadata
async function getEXTINF(song, onlysong) {
    const metadata = await mm.parseFile(song, {"skipCovers": true, "duration": false})
    //console.log(metadata)

    const artist = metadata.common.artist == undefined ? "Unknown Artist" : metadata.common.artist
    const title = metadata.common.title == undefined ? onlysong : metadata.common.title
    const duration = metadata.format.duration == undefined || parseInt(metadata.format.duration) < 1 ? "000001" : metadata.format.duration.toFixed(3).replaceAll(".","")
    const extinf = `#EXTINF:${duration},${artist} - ${title}`

    //console.log(extinf)

    return extinf
}

async function fetchAllSongs() {
    let genbutton = document.getElementById("gen")
    genbutton.setAttribute("disabled", "true")
    let songs = []
    walk.filesSync(config.maindir, (basedir, filename) => {
        songs.push({ filename, "fullpath": basedir + slash + filename})
    })
    songs = songs.filter(song => {
        let splitarr = song.filename.split(".")
        let ext = splitarr[splitarr.length - 1]
        if (config.exts.includes(ext.toLowerCase()) ) {
            return true
        } else {
            return false
        }
    })
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

        setupAutocomplete()
    } else {
        document.getElementById("input-placeholder").innerHTML = "No songs found in this folder, check settings"
    }
    
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
            prgbtn.style.color = "green"
            setTimeout(() => {prgbtn.style.color = ""}, 1000)
        } else (
            console.log("cancelled deleting")
        )
    } else {
        alert("no playlists found, nothing deleted.")
    }

   
}