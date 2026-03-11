// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

const electron = require('@electron/remote')
const dialog = electron.dialog
const fs = require('fs')

const utils = require('./node_modules/roseboxlib/utils.js')

const walk = require('fs-walk')
const Autocomplete = require('@trevoreyre/autocomplete-js')
//const sortable = require('html5sortable/dist/html5sortable.cjs.js')

const slash = process.platform === 'win32' ? "\\" : "/" //desktop file slash
const pslash = "/" //playlist file slash
const bull = `&#8226;`


const AUDIO_EXTS = ['mp3', 'flac']

var config = utils.initOrLoadConfig("./config.json", {
    "maindir": "",
    "exts": AUDIO_EXTS,
    "ignore": [],
    "comPlaylists": {}
})
console.log("config: ", config)

var allSongs = []
var allPlaylists = []

var currPlaylist = []
var editablePlaylists = []
var songsAndPlaylists = []

var playlistName = "Untitled Playlist"
var lastPlaylistName = "" //so we don't have to prompt to save every time
var savePath = ""
var unsavedChanges = false

var mainsearch
var specialMode = false
var artistMode = false
var dragSrcEl = null
var allSongsAreTagged = false
var autocompArr = "both" //both = songsAndPlaylists, playlists = allPlaylists
var highlightedSong = null //currently highlighted autocomplete result

/* ui and other handling */
window.addEventListener('DOMContentLoaded', () => {
    console.log("loaded")
    if (!fs.existsSync("./covers")) { fs.mkdirSync("./covers") } //create covers dir if neccessary
    if (config.maindir !== "") { selectfolder(null, config) }

    //bottom bar
    document.getElementById('cancel').addEventListener("click", discardPlaylistPrompt)
    document.getElementById('save').addEventListener("click", savePlaylistPrompt)
    document.getElementById("folder-open").addEventListener("click", selectfolder)
    document.getElementById('settings').addEventListener("click", initSettings)
    document.getElementById("printPlaylist").addEventListener("click", () => { console.log("currPlaylist: ", currPlaylist) })
    document.getElementById("spe-hide").addEventListener("click", () => { document.getElementById("sp-extra").classList.add("hidden-f") }) //hide extra preview
    //sidebar
    document.getElementById("gen").addEventListener("click", gen)
    document.getElementById('prg').addEventListener("click", purgePlaylists)
    document.getElementById('com').addEventListener("click", playlistOnlyToggle)
    //playlist bar
    document.getElementById('new').addEventListener("click", renamePlaylist)
    document.getElementById('titleh').addEventListener("scroll", (event) => { event.target.scrollTop = 0 })
    //search
    document.getElementById('special').addEventListener("click", specialSearch)
    document.getElementById('mode-toggle').addEventListener("click", artistModeToggle)
    document.addEventListener("keydown", (e) => { //make tab do the same thing as enter
        if (e.which === 9 && highlightedSong !== null) {
            autocompleteSubmit(highlightedSong, true)
            e.target.focus()
        }
    })
    //settings
    document.getElementById("g-repo").addEventListener("click", () => {
        electron.shell.openExternal("http://github.com/KraXen72/playlist-manager")
    })
})

//select main dir
async function selectfolder(mouseevent, inputconfig) {
    if (typeof inputconfig === "undefined") { //clicked on the pick button
        pick = await dialog.showOpenDialog({ properties: ['openDirectory'] })
        console.log(pick)
        if (!pick.canceled) {
            //we need to reload the app when picking a new folder. this checks if user wants to proceed or not
            if (currPlaylist.length > 0 && unsavedChanges) {
                let msgc = await dialog.showMessageBoxSync({
                    message: "selecting a new main directory clears your current playlist. do you wish to proceed?",
                    type: "question",
                    buttons: ["Discard playlist and Proceed", "Cancel"],
                    noLink: true
                })
                if (msgc === 0) {
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

async function notReady(mode) { //true, turn on notReady, false, turn off notready
    if (mode) {
        unsavedChanges = true
        document.getElementById("save").classList.add("btn-danger")
    } else if (!mode) {
        unsavedChanges = false
        document.getElementById("save").classList.remove("btn-danger")
    }
}

//autocomplete

//autocomplete
function setupAutocomplete(message) {
    document.getElementById("input-placeholder").innerHTML = `Start typing a name of a ${message}...`
    mainsearch = new Autocomplete('#autocomplete', {
        search: input => {
            if (input.length < 1 && !specialMode && autocompArr === "both") { return [] }
            let res = autocompArr === "both" ? songsAndPlaylists : autocompArr === "playlists" ? allPlaylists : []

            if (!artistMode) {
                res = res.filter(song => { //find matches
                    return song.filename.toLowerCase().includes(input.toLowerCase()) //fuck regex we doin includes
                })
            } else {
                res = res.filter(song => { //find matches
                    return song.tag.artist.toLowerCase().includes(input.toLowerCase()) //fuck regex we doin includes
                })
            }

            res = res.filter(song => { //filter out things already in playlist to avoid duplicates
                for (let i = 0; i < currPlaylist.length; i++) { if (song.filename === currPlaylist[i].filename) { return false } }; return true
            })
            if (specialMode) {
                res = res.filter(song => {
                    const regex = new RegExp(`[^\\x00-\\x7F]`, 'gi');
                    return song.filename.match(regex)
                })
            }
            //sort the results so playlists are on top
            res.sort((a, b) => { if (a.type === "playlist" && b.type === "song") { return -1 } else if (a.type === "song" && b.type === "playlist") { return 1 } else { return 0 } })

            //if specialmode or playlist only mode then return full results, otherwise first 10
            return specialMode || autocompArr === "playlists" || artistMode ? res : res.slice(0, 10)
        },
        onUpdate: (results, selectedIndex) => {
            if (selectedIndex > -1) {
                updatePreview(results[selectedIndex], false) //update the song preview
                highlightedSong = results[selectedIndex]
            } else {
                highlightedSong = null
            }
        },
        onSubmit: result => { //final pick
            autocompleteSubmit(result, true)
        },
        autoSelect: true,
        submitOnEnter: true,
        getResultValue: result => {
            return utils.getExtOrFn(result.filename).fn + (result.type === "playlist" && autocompArr === "both" ? " (Playlist)" : "")
        } //show the filename in the result
    })
    mainsearch.destroy = () => { autocompleteDestroy(mainsearch) }
}
//autocomplete onSubmit
async function autocompleteSubmit(result, refocus, update) {
    if (update !== undefined) {
        await updatePreview(result, false, update) //update preview without updating, basically just tag song
    } else {
        await updatePreview(result, false) //update preview
    }

    document.getElementById("command-line-input").value = '' //clear the input
    await addSong(result, refocus) //add the song to current playlist
}

//special serach
function specialSearch() {
    document.getElementById("special").classList.toggle("btn-active")
    specialMode = !specialMode
}

//playlist only mode
function playlistOnlyToggle() {
    let com = document.getElementById("com")
    let con = -1
    let onlyContainsPlaylists = true
    for (let i = 0; i < currPlaylist.length; i++) {
        const song = currPlaylist[i];
        if (song.type === "song") {
            onlyContainsPlaylists = false;
            break;
        }
    }
    if (currPlaylist.length === 0 || !unsavedChanges || onlyContainsPlaylists) {
        con = 0
    } else {
        let act = autocompArr === "both" ? "change to" : "exit from"
        con = dialog.showMessageBoxSync({
            message: `Do you wish to discard current playlist and ${act} Playlist only mode?`,
            type: "question",
            buttons: [`Discard playlist and ${act} Playlist only mode`, "Cancel"],
            noLink: true
        })
    }
    if (con === 0) {
        if (!onlyContainsPlaylists) { discardPlaylist() }
        if (autocompArr === "both") {
            com.classList.add("btn-active")

            mainsearch.destroy()
            autocompArr = "playlists"
            setupAutocomplete("playlist")
        } else {
            com.classList.remove("btn-active")

            mainsearch.destroy()
            autocompArr = "both"
            setupAutocomplete("song or playlist")
        }
        return true
    } else {
        return false
    }
}

async function artistModeToggle() {
    let btn = document.getElementById("mode-toggle")
    if (!artistMode) {


        let disablepom = false
        if (autocompArr === "playlists") {
            disablepom = dialog.showMessageBoxSync({
                message: "Searching by artist is not available in playlist only mode. What do you want to do?",
                type: "question",
                buttons: ["Exit playlist-only mode and search by artist", "Stay in playlist-only mode"],
                noLink: true
            })
            if (disablepom === 0) {
                disablepom = true
                playlistOnlyToggle()
            } else {
                disablepom = false
            }
        } else {
            disablepom = true
        }
        if (disablepom) {
            btn.querySelector('.md-person_search').setAttribute("hidden", "true")
            artistMode = true

            if (!allSongsAreTagged) {
                let throbber = btn.querySelector('.md-autorenew')
                throbber.removeAttribute("hidden")
                throbber.classList.add("rotate")
                await fetchMissingArtists()
                throbber.classList.remove("rotate")
                throbber.setAttribute("hidden", "true")
            }
            btn.querySelector('.md-library_music').removeAttribute("hidden")
            document.getElementById('input-placeholder').textContent = `Search songs by artist...`
            btn.title = "search by title"
        }
    } else {
        btn.querySelector('.md-person_search').removeAttribute("hidden")
        btn.querySelector('.md-library_music').setAttribute("hidden", "true")
        artistMode = false
        btn.title = "search by artist"

        document.getElementById('input-placeholder').textContent = `Start typing a name of a ${autocompArr === "both" ? "song or playlist" : "playlist"}...`
    }
}

async function fetchMissingArtists() {
    let inp = document.getElementById('command-line-input')
    let btn = document.getElementById("mode-toggle")
    let sprog = document.getElementById("sprog")
    sprog.style.width = `0`
    sprog.style.opacity = `100%`

    inp.setAttribute("disabled", "true")
    btn.setAttribute("disabled", "true")

    document.getElementById('input-placeholder').textContent = "Getting artist for each song, please wait..."

    const untagged = songsAndPlaylists.filter(s => s.tag === undefined)
    const total = songsAndPlaylists.length
    let done = total - untagged.length // pre-tagged songs count as already done

    const BATCH = 12
    for (let i = 0; i < untagged.length; i += BATCH) {
        await Promise.allSettled(
            untagged.slice(i, i + BATCH).map(song =>
                getEXTINF(song.fullpath, song.filename, true, false).then(tag => { song.tag = tag })
            )
        )
        done = Math.min(done + BATCH, total)
        sprog.style.width = `${done / total * 100}%`
        await new Promise(r => setTimeout(r, 0)) // yield to let the browser paint
    }

    allSongsAreTagged = true
    sprog.style.width = `100%`
    setTimeout(() => { sprog.style.opacity = `0%` }, 500)
    setTimeout(() => { sprog.style.width = `0%` }, 1250)

    mainsearch.destroy()
    inp.removeAttribute("disabled")
    btn.removeAttribute("disabled")
    setupAutocomplete(autocompArr === "both" ? "song or playlist" : "playlist")
}

//preview
/**
 * update the song preview
 * @param {Object} song object
 * @param {Boolean} empty True means clear preveiw
 * @param {Boolean} updateOverride override if we should update
 * @param {Boolean} extraInfo if we should fetch extra info about the song and display everything
 */
async function updatePreview(song, empty, updateOverride, extraInfo) {
    let index = document.getElementById("song-preview").getAttribute("index")
    let type = document.getElementById("song-preview").getAttribute("type")
    let tag = {} //artist, title, album, duration, cover, extinf, coverobj
    let update = true //if we should update
    if (updateOverride !== undefined) {
        update = updateOverride
    }
    if (!empty) {
        if (song.index !== index || song.type !== type || update) {
            if (song.type === "song") {
                if (extraInfo !== undefined && extraInfo) { //fetch extra info if wanted
                    tag = await getEXTINF(song.fullpath, song.filename, true, false, true)
                } else {
                    tag = await getEXTINF(song.fullpath, song.filename, true, false)
                }
                //console.log(song)
            } else if (song.type === "playlist") {
                tag = {
                    title: song.filename,
                    artist: `Playlist ${bull} ${song.songs.length / 2} Songs`,
                    album: utils.shortenFilename(song.fullpath, 55),
                    cover: config.comPlaylists[song.fullpath] !== undefined ? "img/generated.png" : "img/playlist.png"
                }
            }
            song.tag = tag
            document.getElementById("song-preview").setAttribute("index", song.index.toString())
            document.getElementById("song-preview").setAttribute("type", song.type.toString())

        } else { //its the same song
            update = false
        }

    } else { tag = { artist: "", title: "", album: "", cover: "" } } //just clear the preview
    //console.log(tag)
    if (update) {
        if (document.getElementById("song-preview").style.visibility === "hidden") { document.getElementById("song-preview").style.visibility = "visible" }
        document.getElementById("sp-cover").src = `${tag.cover}`
        document.getElementById("sp-title").textContent = tag.title
        document.getElementById("sp-artist").innerHTML = tag.artist
        document.getElementById("sp-album").textContent = tag.album

        if (extraInfo !== undefined && extraInfo) {
            let dur = `${Math.floor(Math.floor(tag.duration) / 1000 / 60)}:${utils.zeropad(Math.floor(tag.duration / 1000) % 60, 2)}` //get min and sec from duration, zeropad it

            //TODO rewrite complex preview assignment
            //there probably has to be a better way to do this?
            //maybe like pass these as an object or an array where there is the desired value + queryselector. and map/assign in a loop 
            document.getElementById("sp-extra").classList.remove("hidden-f")
            document.getElementById("spe-fullpath").textContent = utils.shortenFilename(song.fullpath, 35)
            document.getElementById("spe-fullpath").setAttribute("title", song.fullpath)
            document.getElementById("spe-genre").textContent = tag.extrainfo.genre
            document.getElementById("spe-format").textContent = tag.extrainfo.format
            document.getElementById("spe-duration").textContent = dur === "0:0" ? "Unknown" : dur
            document.getElementById("spe-bitrate").textContent = tag.extrainfo.bitrate
            document.getElementById("spe-size").textContent = tag.extrainfo.size
            document.getElementById("spe-samplerate").textContent = tag.extrainfo.samplerate
            document.getElementById("spe-year").textContent = tag.extrainfo.year

        } else {
            document.getElementById("sp-extra").classList.add("hidden-f")
        }
    }
}

//settings
function initSettings() {
    let body = document.getElementById("settings-body")
    //closeSettings()
    if (body.style.display !== "block") {
        body.style.display = "block"
        document.getElementById("coverpop-body").classList.add("hidden-f") //hide previous popup if there was one
        document.getElementById('settings-close').onclick = closeSettings
        document.getElementById("settings-submit").onclick = saveSettings

        fillSettingPills("settings-exts", config.exts)
        document.getElementById('settings-exts-add').onclick = () => { addPill('settings-exts', 'settings-exts-input') }

        fillSettingPills("settings-ign", config.ignore)
        document.getElementById('settings-ign-add').onclick = () => { addPill('settings-ign', 'settings-ign-input') }
        document.getElementById('settings-ign-pick').onclick = () => { pickFolderAndFillInput('settings-ign-input') }

        document.getElementById('settings-config-import').onclick = () => { importSettings() }
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
function importSettings() {
    let inp = document.getElementById('settings-config-input')
    let sp = inp.nextElementSibling //span

    let conf = {}

    try { //import config
        conf = JSON.parse(inp.value)
        console.log(conf)
        inp.value = ""
        utils.saveConfig("./config.json", conf)
        window.location.reload()

    } catch (e) { //error message
        sp.textContent = "invalid json"
        sp.classList.add("btn-dangerf")
        inp.value = ""
        setTimeout(() => { sp.textContent = "Paste json here"; sp.classList.remove("btn-dangerf") }, 2000)
    }
}

//TODO rewrite this in either like object/constructor type of thing (i do new TagArea(querySelector) and it would set all this up) or react/vue any other frontend framework
//settings pills
//add a pill to wrapper
function addPill(wrapperid, inputid) {
    add = document.getElementById(inputid).value
    if (document.getElementById(wrapperid).innerText === "Nothing found") { document.getElementById(wrapperid).innerHTML = "" } //clear the nothing found
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
    pick = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    console.log(pick)
    if (!pick.canceled) {
        let fullpath = pick.filePaths[0]
        let splitarr = fullpath.split(slash)
        document.getElementById(inputid).value = splitarr[splitarr.length - 1]
    }

}

//album cover display popup
/**
 * show the cover of clicked song but big
 * @param {String} src path to album cover image
 */
function popCover(src) {
    let popBody = document.getElementById("coverpop-body")
    let popImg = document.getElementById("coverdisplay")
    document.getElementById("coverpop-close").onclick = () => { popBody.classList.add("hidden-f") }

    popBody.classList.remove("hidden-f")
    popImg.setAttribute("src", src)
}

/*playlist handling*/

/*new playlist*/

function renamePlaylist() {
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
            titleh.style.display = "-webkit-box"
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
        titleh.style.display = "-webkit-box"
        wrap.style.display = "none"
        sub.onclick = ""
        canc.onclick = ""
        newbtn.style.display = "flex"
    }
}

function discardPlaylistPrompt() {
    if (currPlaylist.length > 0 && unsavedChanges) {
        document.getElementById("command-line-input").blur()
        let con = dialog.showMessageBoxSync({
            message: "do you wish to discard current playlist?",
            type: "question",
            buttons: ["Discard playlist", "Cancel"],
            noLink: true
        })
        if (con === 0) {
            discardPlaylist()
        }
    } else {
        discardPlaylist()
    }
}
//discard the current playlist
function discardPlaylist() {
    notReady(false)
    utils.clearFolder("./covers")
    document.getElementById("playlist-bar").querySelectorAll(".songitem").forEach(s => s.remove())
    currPlaylist = []
    document.getElementById("song-preview").style.visibility = "hidden"
    document.getElementById("openspan").style.display = "block"
    playlistName = "Untitled Playlist"
    document.getElementById("titleh").textContent = playlistName
    if (autocompArr === "playlists") { document.getElementById("com").click() }
}


function savePlaylistPrompt() {
    if (currPlaylist.length > 0) {
        let onlyContainsPlaylists = true
        for (let i = 0; i < currPlaylist.length; i++) {
            const song = currPlaylist[i];
            if (song.type === "song") {
                onlyContainsPlaylists = false;
                break;
            }
        }
        if (onlyContainsPlaylists && autocompArr === "both") {
            let con = -1
            con = dialog.showMessageBoxSync({
                message: "Do you want to save this as a combined playlist?",
                detail: `Combined Playlists can only consist of other playlists, but if if any of the playlists update (you add a new song), you can easily re-make/update the generated playlist to include all the new stuff.`,
                type: "question",
                buttons: ["Save as Combined Playlist", "Save as a normal Playlist"],
                noLink: true
            })
            if (con === 0) {
                document.getElementById("com").click()
            }
        }
        if (playlistName === "Untitled Playlist") {
            dialog.showMessageBoxSync({ "message": "Please name your playlist first" })
        } else {
            if (autocompArr === 'playlists') {
                let cPlaylist = currPlaylist.map(p => { return { "filename": p.filename, "fullpath": p.fullpath, "relativepath": p.relativepath } })
                config.comPlaylists[`${config.maindir + slash + playlistName}.m3u`] = cPlaylist
                utils.saveConfig("./config.json", config)
            }
            if (playlistName === lastPlaylistName && savePath !== undefined) {
                savePlaylist()
            } else {
                new Notification("playlist-manager", {
                    body: `Your playlist has been saved to:\n${config.maindir + slash + playlistName}.m3u`,
                    icon: "img/playlist.png",
                    timeoutType: "default",
                })
                savePath = `${config.maindir + slash + playlistName}.m3u`
                if (savePath !== undefined) { lastPlaylistName = playlistName; savePlaylist() }
            }
        }
    }
}

function savePlaylist() { //actually save the playlist
    notReady(false)
    let lines = getPlaylistContent() //this is with duplicate songs possible
    lines = removeDuplicatesFromPlaylist(lines)

    fs.writeFileSync(savePath, lines.join("\n"))

    // Keep the in-memory entry up-to-date so refreshSidebarPlaylists shows correct song count
    const savedLines = lines.filter(l => l !== "#EXTM3U" && l.trim() !== "")
    const existing = songsAndPlaylists.find(p => p.fullpath === savePath)
    if (existing) {
        existing.songs = savedLines
        existing.tag.artist = `Playlist ${bull} ${savedLines.length / 2} Songs`
    }

    document.getElementById("save").classList.add("btn-active")
    refreshSidebarPlaylists()
    setTimeout(() => { document.getElementById("save").classList.remove("btn-active") }, 1000)
}

/**
 * get a array of lines in extm3u (to write) from the currPlaylist (global)
 */
function getPlaylistContent() {
    //console.log(currPlaylist)
    let play = []

    play.push("#EXTM3U")
    for (let i = 0; i < currPlaylist.length; i++) {
        const song = currPlaylist[i];
        if (song.type === "song") {
            play.push(song.tag.extinf)
            play.push(song.relativepath.replaceAll(slash, pslash))
        } else if (song.type === "playlist") {
            let spl = song.relativepath.split(slash)
            let relpath = spl.slice(0, spl.length - 1).join(pslash) //what does this shit even do??
            //console.log(relpath)

            for (let i = 0; i < song.songs.length; i++) {
                const item = song.songs[i];
                if (item.includes("#EXTINF")) {
                    play.push(item)
                } else {
                    play.push([relpath, item].join(pslash))
                }
            }
        }
    }
    //it saves all paths with normal slashes
    return play
}
/**
 * remove duplicates from an array of m3u lines
 * @param {Array} arr array of lines in extm3u syntax
 * @returns array of lines in extm3u syntax without duplicates
 */
function removeDuplicatesFromPlaylist(arr) {
    //console.log("initial_songs: ", arr)

    let uniqueSongs = new Set(arr)
    uniqueSongs = [...uniqueSongs]

    //console.log("unique: ", uniqueSongs)
    return uniqueSongs
}

//add a song to the current playlist
async function addSong(songobj, refocus) {
    notReady(true)
    let tag = songobj.tag

    let songElem = document.createElement("div")
    let remElem = document.createElement("div")
    let moreElem = document.createElement("div")
    let id = Date.now().toString()

    if (tag.coverobj !== false && songobj.type === "song") {
        fs.writeFileSync(`covers${slash}cover-${id}.${tag.coverobj.frmt}`, tag.coverobj.data)
    }
    let imgpath = ""
    if (songobj.type === "song") {
        imgpath = `covers/cover-${id}.${tag.coverobj !== false ? tag.coverobj.frmt : "png"}`
    } else if (songobj.type === "playlist") {
        imgpath = config.comPlaylists[songobj.fullpath] !== undefined ? "img/generated.png" : "img/playlist.png"
    }

    songElem.className = "songitem"
    let siOptions = {
        coverid: id,
        coversrc: imgpath,
        title: tag.title,
        artist: tag.artist,
        album: tag.album,
        filename: songobj.filename,
        strong: false
    }
    songElem.innerHTML = generateSongitem(siOptions)
    songElem.setAttribute("index", songobj.index.toString())
    songElem.dataset.fullpath = songobj.fullpath
    songElem.setAttribute("draggable", "true")

    songElem.addEventListener("dragstart", (e) => {
        dragSrcEl = songElem
        e.dataTransfer.effectAllowed = "move"
        setTimeout(() => songElem.classList.add("dragging"), 0)
    })
    songElem.addEventListener("dragend", () => {
        songElem.classList.remove("dragging")
        document.querySelectorAll(".songitem.drag-over").forEach(el => el.classList.remove("drag-over"))
    })
    songElem.addEventListener("dragover", (e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
        if (dragSrcEl !== songElem) {
            document.querySelectorAll(".songitem.drag-over").forEach(el => el.classList.remove("drag-over"))
            songElem.classList.add("drag-over")
        }
    })
    songElem.addEventListener("dragleave", () => {
        songElem.classList.remove("drag-over")
    })
    songElem.addEventListener("drop", (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (dragSrcEl === null || dragSrcEl === songElem) return
        const pb = document.getElementById("playlist-bar")
        const children = [...pb.querySelectorAll(".songitem")]
        const srcIdx = children.indexOf(dragSrcEl)
        const tgtIdx = children.indexOf(songElem)
        if (srcIdx < tgtIdx) {
            pb.insertBefore(dragSrcEl, songElem.nextSibling)
        } else {
            pb.insertBefore(dragSrcEl, songElem)
        }
        songElem.classList.remove("drag-over")
        const newOrder = [...pb.querySelectorAll(".songitem")]
        const oldPlaylist = [...currPlaylist]
        currPlaylist = newOrder.map(el => oldPlaylist.find(s => s.fullpath === el.dataset.fullpath)).filter(Boolean)
        notReady(true)
    })

    moreElem.classList.add("songitem-button"/*, "hidden", "vertical-icon-minwidth"*/)
    moreElem.setAttribute("title", "more options")
    let mmfunction = (event) => {
        let opt = { event, menuItems: [] }

        if (songobj.type === "playlist") { //playlist specific
            opt.menuItems.push({
                text: "Details",
                run: () => {
                    let msg = ""
                    if (config.comPlaylists[songobj.fullpath] !== undefined) {
                        msg = `This generated playlist contains these playlists:\n${config.comPlaylists[songobj.fullpath].map(pl => pl.filename).join("\n")}`
                    } else {
                        msg = `This playlist contains:\n${songobj.songs.filter(line => !line.includes("#EXTINF")).join("\n")}`
                    }
                    dialog.showMessageBoxSync({
                        message: msg,
                        type: "info",
                        noLink: true
                    })
                }
            })
        } else { //song specific
            opt.menuItems.push(
                {
                    text: "Details",
                    run: () => {
                        updatePreview(songobj, false, true, true)
                    }
                },
                {
                    text: "View cover",
                    run: () => {
                        popCover(imgpath)
                    }
                }/*,
                {   text: "Edit Tags", 
                    run: () => {
                        alert("placeholder for tag editor")
                    }}*/
            )
        }
        utils.summonMenu(opt)
    }
    moreElem.innerHTML = `<i class="material-icons-round md-more_vert"></i>`

    moreElem.onclick = mmfunction
    songElem.oncontextmenu = mmfunction

    remElem.classList.add("songitem-button")
    remElem.setAttribute("title", "Remove song from this playlist")
    remElem.innerHTML = `<i class="material-icons-round md-close"></i>`
    remElem.onclick = () => {
        notReady(true)
        if (currPlaylist.length === 1) { document.getElementById("song-preview").style.visibility = "hidden" }
        for (let i = 0; i < currPlaylist.length; i++) {
            const song = currPlaylist[i];
            if (songobj.fullpath === song.fullpath) {
                currPlaylist.splice(i, 1)
                break;
            }
        }
        if (currPlaylist.length === 0) {
            document.getElementById("openspan").style.display = "block"
        }
        if (songobj.type === "song") {
            try { fs.unlinkSync(`covers${slash}cover-${id}.${tag.coverobj.frmt}`) } catch (e) {
                console.log("failed to delete cover, probably")
            }
        }
        songElem.remove()
    }

    songElem.querySelector(".songitem-button-wrap").appendChild(moreElem)
    songElem.querySelector(".songitem-button-wrap").appendChild(remElem)
    if (currPlaylist.length === 0) {
        document.getElementById("openspan").style.display = "none"
    }
    let pb = document.getElementById("playlist-bar")
    pb.appendChild(songElem)
    songElem.scrollIntoView()


    //this briefly selects the image to update it because some images are wierd and don't render on their own
    setTimeout(() => {
        document.getElementById("command-line-input").blur()
        var s = window.getSelection()
        var r = document.createRange();
        s.removeAllRanges()
        r.selectNode(songElem.querySelector(".songitem-cover-wrap"));
        s.addRange(r)

        setTimeout(() => {
            s.removeAllRanges();
            setTimeout((refocus) => {
                if (refocus) { document.getElementById("command-line-input").focus() }
            }, 3, refocus)
        }, 10, refocus)
    }, 2, refocus)

    if (songobj.type === "song") {
        songobj.tag.cover = ""
        songobj.tag.coverobj.data = ""
    }

    currPlaylist.push(songobj)
}
//return the innerhtml for a songitem element
function generateSongitem(val) {
    let strongtag = val.strong !== undefined && val.strong ? ["<strong>", "</strong>"] : ["", ""];
    if (!fs.existsSync(val.coversrc)) { val.coversrc = "" };
    return `
    <div class="songitem-cover-wrap">
        <div class="songitem-cover-placeholder" style = "${val.coversrc !== "" ? "display: none" : ""}"></div>
        <img class="songitem-cover cover-${val.coverid}" draggable="false" loading="lazy" src="${val.coversrc}" onerror = "this.src = 'img/placeholder.png'" style = "${val.coversrc === "" ? "display: none" : ""}"></img>
    </div>
    <div class="songitem-title" title="${utils.fixQuotes(val.title)}">${strongtag[0]}${val.title}${strongtag[1]}</div>
    <div class="songitem-aa">
        <span class="songitem-artist" title="${utils.fixQuotes(val.artist)}">${val.artist}</span>&nbsp;&#8226;&nbsp;<span class = "songitem-album" title="${utils.fixQuotes(val.album)}">${val.album}</span>
    </div>
    <div class="songitem-filename" hidden>${val.filename}</div>
    <div class="songitem-button-wrap"></div>
    `
}

/*playlist handling - file manipulation etc*/

//walk all directories and then call generateM3U()
const gen = async () => {

    let alldirs = []
    let gprog = document.getElementById("gprog") //generate progress bar
    let genbutton = document.getElementById("gen")
    genbutton.setAttribute("disabled", "true")
    gprog.style.width = `0`
    gprog.style.opacity = `100%`

    walk.dirsSync(config.maindir, (basedir, filename, stats) => {
        alldirs.push({ basedir, filename, "fullpath": basedir + slash + filename, stats })
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
        gprog.style.width = `${i / alldirs.length * 100}%`
    }
    gprog.style.width = `100%`
    setTimeout(() => { gprog.style.opacity = `0%` }, 500)
    setTimeout(() => { gprog.style.width = `0%` }, 1250)
    //await generateM3U(alldirs[22].fullpath, true)
    console.log("done")
    genbutton.removeAttribute("disabled")
    genbutton.classList.add("btn-active")
    setTimeout(() => { genbutton.classList.remove("btn-active") }, 1000)
};

//generate a m3u for given folder
async function generateM3U(folder, useEXTINF) {
    const allsongs = []

    if (useEXTINF) { allsongs.push("#EXTM3U") }
    let relativedir = folder.split(slash)
    relativedir = relativedir[relativedir.length - 1]
    let appendname = ""
    //console.log(relativedir)

    let walksongs = []

    //find all songs in the folder
    walk.filesSync(folder, (basedir, filename) => {
        walksongs.push({ basedir, filename })
    })
    //loop through all of them
    for (let i = 0; i < walksongs.length; i++) {
        const walksong = walksongs[i];
        let filename = walksong.filename
        let basedir = walksong.basedir

        song = filename
        songext = utils.getExtOrFn(song).ext
        if (basedir.replace(folder, "").length > 0) { //stupid fucking piece of shit
            appendname = basedir.replace(folder, "").replace(slash, "")
            if (appendname.length > 0) { appendname += pslash }
        }
        //if the song extension is in allowed list
        if (config.exts.includes(songext)) {

            if (useEXTINF) {
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
/**
 * read song file to get metadata
 * @param {String} song full path to file
 * @param {String} onlysong relative path to file (no folder)
 * @param {Boolean} returnObj if true, return full object instead of EXTINF string
 * @param {Boolean} skipCovers if true, skip fetching covers (faster)
 * @param {Boolean} fetchExtraInfo if true, fetch extra info
 */
async function getEXTINF(song, onlysong, returnObj, skipCovers, fetchExtraInfo) {
    const mm = await import('music-metadata')
    var metadata
    try {
        metadata = await mm.parseFile(song, { "skipCovers": skipCovers, "duration": false })
    } catch (e) {
        console.warn(song, e)
        metadata = { //when we get Error: EINVAL: invalid argument, read for certain songs, make a dummy extinf
            common: {}, format: { duration: 1, bitrate: "unknown", sampleRate: "unknown" }, quality: { warnings: ["failed to get extinf"] }
        }
    }
    metadata.quality.warnings = metadata.quality.warnings.length //replace warnings array with just the number of warnings
    //console.log("metadata: ",metadata)

    let extrainfo = {}

    var artist = metadata.common.artist === undefined ? "Unknown Artist" : metadata.common.artist
    const title = metadata.common.title === undefined ? onlysong : metadata.common.title
    const album = metadata.common.album === undefined ? "Unknown Album" : metadata.common.album
    const duration = metadata.format.duration === undefined || parseInt(metadata.format.duration) < 1 ? "000001" : metadata.format.duration.toFixed(3).replaceAll(".", "")

    if (metadata.common.artists !== undefined && metadata.common.artists.length > 1) {
        artist = metadata.common.artists.join(" / ")
    }
    if (fetchExtraInfo !== undefined && fetchExtraInfo) {
        let lstat = fs.lstatSync(song)
        extrainfo.size = (lstat.size / 1000000).toFixed(2).toString() + " MB"
        extrainfo.format = metadata.format.codec
        extrainfo.bitrate = Math.round(metadata.format.bitrate / 1000).toString() + " kb/s"
        extrainfo.samplerate = metadata.format.sampleRate.toString() + " Hz"

        if (metadata.common.genre !== undefined && metadata.common.genre.length !== 0) {
            extrainfo.genre = metadata.common.genre.join(" / ")
        } else {
            extrainfo.genre = "Unknown Genre"
        }
        extrainfo.year = metadata.common.year !== undefined ? metadata.common.year : "Unknown Year"


        //console.log(extrainfo)
    }


    const extinf = `#EXTINF:${duration},${artist} - ${title}`

    if (!skipCovers) {
        const pic = mm.selectCover(metadata.common.picture)
        var cover = ""
        if (pic !== undefined && pic !== null) {
            let frmt = pic.format.replaceAll("image/", "")

            cover = `data:${pic.format};base64,${pic.data.toString('base64')}`
            coverobj = { frmt, "data": pic.data }
        } else {
            cover = ""
            coverobj = false
        }
    }

    //console.log(extinf)
    if (returnObj) {
        return { artist, title, album, duration, cover, extinf, coverobj, extrainfo }
    } else {
        return extinf
    }
}

async function fetchAllSongs() {
    //clear the playlists
    allSongs = []
    allPlaylists = []
    songsAndPlaylists = []
    editablePlaylists = []

    //check for config com playlists if some are missing delete them
    for (let i = 0; i < Object.keys(config.comPlaylists).length; i++) {
        const complaylist = Object.keys(config.comPlaylists)[i];
        //console.log(complaylist)
        if (!fs.existsSync(complaylist)) {
            delete config.comPlaylists[complaylist]
        }
    }

    let genbutton = document.getElementById("gen")
    genbutton.setAttribute("disabled", "true")
    let songs = []
    walk.filesSync(config.maindir, (basedir, filename) => {
        let fp = basedir + slash + filename
        songs.push({ filename, "fullpath": fp, "relativepath": fp.replaceAll(config.maindir + slash, "") })
    })
    songs = songs.filter(song => {
        let ext = utils.getExtOrFn(song.filename).ext
        if (config.exts.includes(ext.toLowerCase(ext))) {
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
        //console.log(songs)
        document.getElementById("command-line-input").removeAttribute("disabled")
        genbutton.removeAttribute("disabled")

        allSongs = songs

        utils.clearFolder("./covers")
        autocompArr = "both"
        setupAutocomplete("song or playlist")
    } else {
        document.getElementById("input-placeholder").innerHTML = "No songs found in this folder, check settings"
    }

    //playlists
    let playlists = []
    walk.filesSync(config.maindir, (basedir, filename) => {
        let fp = basedir + slash + filename
        playlists.push({ filename, "fullpath": fp, "relativepath": fp.replaceAll(config.maindir + slash, "") })
    })
    playlists = playlists.filter(playlist => {
        let ext = utils.getExtOrFn(playlist.filename).ext
        if (ext.toLowerCase() === "m3u") {
            return true
        } else {
            return false
        }
    }).map(playlist => {
        let lines = fs.readFileSync(playlist.fullpath, { "encoding": "utf-8" }).split("\n").map(line => line.trim()).filter(line => { if (line === "#EXTM3U" || line === "") { return false } else { return true } })
        //filter out extm3u stuff

        playlist.songs = lines
        playlist["type"] = "playlist"
        playlist.tag = {
            title: playlist.filename,
            artist: `Playlist ${bull} ${playlist.songs.length / 2} Songs`,
            album: utils.shortenFilename(playlist.fullpath, 60),
            cover: config.comPlaylists[playlist.fullpath] !== undefined ? "img/generated.png" : "img/playlist.png"
        }
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

    //created playlists
    refreshSidebarPlaylists()

    console.log(editablePlaylists)
}

// Rebuild editablePlaylists from the top-level m3u files in maindir and re-render the sidebar.
// For files not yet in songsAndPlaylists (e.g. just saved for the first time), reads them from disk.
function refreshSidebarPlaylists() {
    const topLevel = fs.readdirSync(config.maindir).filter(
        item => fs.lstatSync(config.maindir + slash + item).isFile()
    ).filter(item => utils.getExtOrFn(item).ext.toLowerCase() === "m3u")

    editablePlaylists = topLevel.map(item => {
        const fp = config.maindir + slash + item
        let p = songsAndPlaylists.find(cp => cp.fullpath === fp)
        if (!p) {
            // New file – build an entry and register it so the rest of the app can find it
            const lines = fs.readFileSync(fp, { encoding: "utf-8" })
                .split("\n").map(l => l.trim()).filter(l => l !== "#EXTM3U" && l !== "")
            p = {
                filename: item,
                fullpath: fp,
                relativepath: fp.replaceAll(config.maindir + slash, ""),
                songs: lines,
                type: "playlist",
                index: allPlaylists.length.toString(),
                tag: {
                    title: item,
                    artist: `Playlist ${bull} ${lines.length / 2} Songs`,
                    album: utils.shortenFilename(fp, 60),
                    cover: config.comPlaylists[fp] !== undefined ? "img/generated.png" : "img/playlist.png"
                }
            }
            allPlaylists.push(p)
            songsAndPlaylists.push(p)
        }
        p.mode = config.comPlaylists[p.fullpath] !== undefined ? "com" : "new"
        return p
    })

    loadPlaylistsSidebar(editablePlaylists)
    if (editablePlaylists.length > 0) { document.getElementById("yourplaylistshr").style.display = "block" }
}

//load a playlist, "playlist" is an object, mode is new or com
async function loadPlaylist(playlist, mode) {
    //sdebugger;
    discardPlaylist()
    playlistName = utils.getExtOrFn(playlist.filename).fn
    lastPlaylistName = playlistName
    savePath = playlist.fullpath

    let titleh = document.getElementById("titleh")

    if (mode === "com") {
        if (autocompArr === "both") { document.getElementById("com").click() } //turn on playlist only mode

        let loadPlaylists = config.comPlaylists[playlist.fullpath] //array of playlists this is made of
        for (let i = 0; i < loadPlaylists.length; i++) { //for each playlist we wanna add
            const pl = loadPlaylists[i];
            //for loop find the desired playlist, push to currPlaylist and break from for loop
            for (let j = 0; j < allPlaylists.length; j++) {
                const compp = allPlaylists[j];
                if (compp.fullpath === pl.fullpath) {
                    await autocompleteSubmit(compp, false, false)
                    break;
                }
            }
        }
        document.getElementById("playlist-scroll-wrap").scrollTop = 0;
    } else {
        let onlysongs = playlist.songs.filter(s => !s.includes("#EXTINF")).map(s => s.trim().replaceAll(pslash, slash))
        //replace all normal slashes for os slashes when loading, so it can actually load the songs.
        console.time("fetchSongObjs")
        console.log(onlysongs)
        songobjs = []
        for (let i = 0; i < onlysongs.length; i++) {
            const song = songsAndPlaylists.filter(s => s.relativepath === onlysongs[i])[0]
            if (song === undefined) { console.warn("Song not found in library, skipping:", onlysongs[i]); continue }
            if (song.tag === undefined || song?.tag?.cover === "" || song?.tag?.coverobj?.data === "") {
                song.tag = await getEXTINF(song.fullpath, song.filename, true, false)
            }
            songobjs.push(song)
        }
        console.timeEnd("fetchSongObjs")
        console.log(songobjs)
        for (let i = 0; i < songobjs.length; i++) {
            addSong(songobjs[i], false)
        }

        document.getElementById("playlist-scroll-wrap").scrollTop = 0;

        /*for (let i = 0; i < onlysongs.length; i++) {
            const song = onlysongs[i];
            //for loop find a song, push to currPlaylist and break from for loop
            for (let j = 0; j < songsAndPlaylists.length; j++) {
                const compsong = songsAndPlaylists[j];
                if (compsong.relativepath === song) {
                    await autocompleteSubmit(compsong, false, false)
                    break;
                }
            }
        }*/
    }
    notReady(false)
    playlistName = lastPlaylistName
    titleh.textContent = lastPlaylistName
    /*
    let sopts = {
        handle: ".songitem-cover-wrap",
        placeholder: `<hr>`
    }
    sortable('#playlist-bar', sopts)*/
    //sortable.sortable("#playlist-bar")
}

function loadPlaylistsSidebar(eplaylists) {
    document.getElementById("sidebar-playlists").innerHTML = ""

    eplaylists.forEach(playlist => { //make a songitem for each playlist
        let pElem = document.createElement("div")
        let editElem = document.createElement("div")
        pElem.classList.add("songitem")
        let title = playlist.tag.title
        title = title.slice(0, title.length - 4) //strip .m3u from title
        let opts = {
            coverid: "",
            coversrc: "",
            title: title,
            artist: `${playlist.songs.length / 2} Songs`,
            album: playlist.tag.album,
            filename: playlist.filename,
            strong: true
        }
        pElem.style.gridTemplateColumns = "0rem minmax(0%, 100%) min-content"
        pElem.innerHTML = generateSongitem(opts)

        if (playlist.mode === "com") {
            let regenElem = document.createElement("div")
            regenElem.classList.add("songitem-button")
            regenElem.setAttribute("title", "re-make / update: generate this playlist again if you added new songs or removed some")
            regenElem.innerHTML = `<i class="material-icons-round md-autorenew"></i>`
            regenElem.onclick = async () => {
                regenElem.classList.add("rotate")
                let currPlaylist_bak = [...currPlaylist]
                discardPlaylist()
                await gen()
                await fetchAllSongs()
                await loadPlaylist(playlist, playlist.mode)
                savePlaylist()
                discardPlaylist()
                if (autocompArr === "playlists") { document.getElementById("com").click() }
                playlistName = lastPlaylistName
                currPlaylist = [...currPlaylist_bak]
                regenElem.classList.remove("rotate")

                loadPlaylistsSidebar(editablePlaylists)
                window.location.reload()
            }

            //editElem.style.gridColumn = "4 / 5"
            pElem.querySelector(".songitem-button-wrap").appendChild(regenElem)
        }

        editElem.classList.add("songitem-button")
        editElem.setAttribute("title", "Edit Playlist")
        editElem.innerHTML = `<i class="material-icons-round md-drive_file_rename_outline"></i>`
        editElem.onclick = async () => { //load playlist loadplaylist
            //console.log(playlist)
            let con = -1
            if (currPlaylist.length === 0 || !unsavedChanges) {
                con = 0
            } else {
                con = dialog.showMessageBoxSync({
                    message: `do you wish to discard current playlist and load '${playlist.filename}'?`,
                    type: "question",
                    buttons: [`Discard playlist and Load '${playlist.filename}'`, "Cancel"],
                    noLink: true
                })
            }
            if (con === 0) {
                loadPlaylist(playlist, playlist.mode)
            }

        }
        pElem.querySelector(".songitem-button-wrap").appendChild(editElem)

        document.getElementById("sidebar-playlists").appendChild(pElem)
    })
}

//delete all generated playlists
function purgePlaylists() {
    let playlists = [...allPlaylists].filter(p => !editablePlaylists.includes(p))
    if (!unsavedChanges) {
        if (playlists.length > 0) {

            let playliststr = playlists.map(playlist => playlist.filename).join(", ")
            let prgbtn = document.getElementById("prg")

            let message = `Are you sure you want to delete all these playlists?
            ${playliststr}`

            let decision = window.confirm(message)
            if (decision) {
                let delpaths = playlists.map(p => p.fullpath)
                delpaths.forEach(p => {
                    fs.unlinkSync(p, (err) => console.log(err))
                })
                console.log("deleted sucessfully")
                prgbtn.classList.add("btn-active")
                setTimeout(() => {
                    prgbtn.classList.remove("btn-active");
                    window.location.reload()
                }, 1000)
            } else (
                console.log("cancelled deleting")
            )
        } else {
            let msgc = dialog.showMessageBoxSync({
                message: "no playlists found, nothing deleted.",
                type: "info",
                buttons: ["Ok"],
                noLink: true
            })
        }
    } else {
        let msgc = dialog.showMessageBoxSync({
            message: "Cannot purge playlists as you have unsaved changes. Either save this playlist (will not be purged) or discard it. Then try to purge again.",
            type: "info",
            buttons: ["Ok"],
            noLink: true
        })
    }

}

//for @trevoreyre/autocomplete-js
function autocompleteDestroy(instance) {
    document.body.removeEventListener('click', instance.handleDocumentClick)
    instance.input.removeEventListener('input', instance.core.handleInput)
    instance.input.removeEventListener('keydown', instance.core.handleKeyDown)
    instance.input.removeEventListener('focus', instance.core.handleFocus)
    instance.input.removeEventListener('blur', instance.core.handleBlur)
    instance.resultList.removeEventListener(
        'mousedown',
        instance.core.handleResultMouseDown
    )
    instance.resultList.removeEventListener('click', instance.core.handleResultClick)

    instance.root = null
    instance.input = null
    instance.resultList = null
    instance.getResultValue = null
    instance.onUpdate = null
    instance.renderResult = null
    //autocompleteDestroy(instance.core)
    instance.core = null
}