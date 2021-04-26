// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

const electron = require('electron').remote
const dialog = electron.dialog

const utils = require('./utils.js')

const walk = require('fs-walk')
const mm = require('music-metadata');
const fs = require('fs')

var slash = process.platform === 'win32' ? "\\" : "/"
var config = utils.initOrLoadConfig("./config.json")
console.log(config)

/* ui and other handling */
window.addEventListener('DOMContentLoaded', () => {
    console.log("loaded")
    if (config.maindir !== "") {selectfolder(null, config)}
    document.getElementById("folder-open").addEventListener("click", selectfolder)
    document.getElementById("gen").addEventListener("click",() => {setTimeout(() =>{gen()}, 2000)})
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

/*playlist handling*/

//walk all directories and then call generateM3U()
async function gen() {
    let alldirs = []

    walk.dirsSync(config.maindir, (basedir, filename, stats) => {
        alldirs.push({basedir, filename, "fullpath": basedir + slash + filename, stats})
    })
    //console.log(alldirs)
    alldirs.forEach((dir) => {generateM3U(dir.fullpath, true)})
    //await generateM3U(alldirs[22].fullpath, true)
    console.log("done")
    
}

//generate a m3u for given folder
async function generateM3U(folder, useEXTINF) {
    const allsongs = []
    if (useEXTINF) {allsongs.push("#EXTM3U")}
    let relativedir = folder.split(slash)
    relativedir = relativedir[relativedir.length -1]

    let walksongs = []

    walk.filesSync(folder, (basedir, filename) => {
        walksongs.push({basedir, filename})
    })

    for (let i = 0; i < walksongs.length; i++) {
        const walksong = walksongs[i];
        let filename = walksong.filename
        let basedir = walksong.basedir

        song = filename
        extarr = song.split(".")
        //if the song extension is in allowed list
        if (config.exts.includes(extarr[extarr.length - 1])) {   
            if (useEXTINF == true) {
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