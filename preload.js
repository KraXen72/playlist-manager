// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

const electron = require('electron').remote
const dialog = electron.dialog
const fs = require('fs')

const utils = require('./utils.js')

const walk = require('fs-walk')
const mm = require('music-metadata');

var slash = process.platform === 'win32' ? "\\" : "/"
var config = utils.initOrLoadConfig("./config.json")
console.log(config)

/* ui and other handling */
window.addEventListener('DOMContentLoaded', () => {
    console.log("loaded")
    if (config.maindir !== "") {selectfolder(null, config)}
    document.getElementById("folder-open").addEventListener("click", selectfolder)
    document.getElementById("gen").addEventListener("click",() => {gen()})
    document.getElementById('settings').addEventListener("click", initSettings)

})

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
}

//settings
function initSettings() {
    let body = document.getElementById("settings-body")
    //closeSettings()
    if (body.style.display !== "block") {
        body.style.display = "block"
        fillSettingPills("settings-exts", config.exts)

        document.getElementById('settings-close').onclick = closeSettings
        document.getElementById('settings-exts-add').onclick = () => {addPill('settings-exts', 'settings-exts-input')}
        document.getElementById("settings-submit").onclick = saveSettings
    }
}
function closeSettings() {
    document.getElementById("settings-body").style.display = "none"
}
function saveSettings() {
    let exts = []
    document.getElementById("settings-exts").querySelectorAll(".pillval").forEach(pill => exts.push(pill.innerText))
    console.log(exts)
    config.exts = exts
    utils.saveConfig("./config.json", config)
}

//settings pills
function addPill(wrapperid, inputid) {
    add = document.getElementById(inputid).value
    if (add !== "") {
        document.getElementById(wrapperid).innerHTML += 
    `<div class="pill"><span class="pillval">${add}</span><button class="closepill" onclick="this.parentElement.remove()">&times;</button></div>`
    document.getElementById(inputid).value = ""
    }
    
}
function fillSettingPills(wrapperid, settingarr) {
    document.getElementById(wrapperid).innerHTML = ""
    for (let i = 0; i < settingarr.length; i++) {
        document.getElementById(wrapperid).innerHTML +=
        `<div class="pill"><span class="pillval">${settingarr[i]}</span><button class="closepill" onclick="this.parentElement.remove()">&times;</button></div>`   
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