// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

const electron = require('electron').remote
const dialog = electron.dialog
const fs = require('fs')

const utils = require('./utils.js')

const walk = require('fs-walk')
const mm = require('music-metadata');
const Autocomplete = require('@trevoreyre/autocomplete-js')
//const sortable = require('html5sortable/dist/html5sortable.cjs.js')

const slash = process.platform === 'win32' ? "\\" : "/" //desktop file slash
const pslash = "/" //playlist file slash
const bull = `&#8226;`
const specialRegex = new RegExp("[^\x00-\x7F]", "gm")
var config = utils.initOrLoadConfig("./config.json")
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
var allSongsAreTagged = false
var autocompArr = "both" //both = songsAndPlaylists, playlists = allPlaylists

/* ui and other handling */
window.addEventListener('DOMContentLoaded', () => {
    console.log("loaded")
    if (config.maindir !== "") {selectfolder(null, config)}
    //bottom bar
    document.getElementById('cancel').addEventListener("click", discardPlaylistPrompt)
    document.getElementById('save').addEventListener("click", savePlaylistPrompt)
    document.getElementById("folder-open").addEventListener("click", selectfolder)
    document.getElementById('settings').addEventListener("click", initSettings)
    document.getElementById("printPlaylist").addEventListener("click", () => {console.log("currPlaylist: ", currPlaylist)})
    document.getElementById("spe-hide").addEventListener("click", () => {document.getElementById("sp-extra").classList.add("hidden-f")}) //hide extra preview
    //sidebar
    document.getElementById("gen").addEventListener("click",gen)
    document.getElementById('prg').addEventListener("click", purgePlaylists)
    document.getElementById('com').addEventListener("click", playlistOnlyToggle)
    //playlist bar
    document.getElementById('new').addEventListener("click", renamePlaylist)
    document.getElementById('titleh').addEventListener("scroll", (event) => {event.target.scrollTop = 0})
    //search
    document.getElementById('special').addEventListener("click", specialSearch)
    document.getElementById('mode-toggle').addEventListener("click", artistModeToggle)
    document.addEventListener("keydown", (e) => { //make tab do the same thing as enter
        if(e.which == 9){
            let song = {}
            //get the song index from the index attribute
            if (autocompArr == "both") {
                song = songsAndPlaylists[parseInt(e.target.value.replaceAll('<span index="', "").split('"')[0])] 
            } else if (autocompArr == "playlists") {
                song = allPlaylists[parseInt(e.target.value.replaceAll('<span index="', "").split('"')[0])]
            }
            autocompleteSubmit(song, true)
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
        pick = await dialog.showOpenDialog({properties: ['openDirectory']})
        console.log(pick)
        if (pick.canceled == false) {
            //we need to reload the app when picking a new folder. this checks if user wants to proceed or not
            if (currPlaylist.length > 0 && unsavedChanges == true) {
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

async function notReady(mode) { //true, turn on notReady, false, turn off notready
    if (mode == true) {
        unsavedChanges = true
        document.getElementById("save").classList.add("btn-danger")
    } else if (mode == false) {
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
          if (input.length < 1 && specialMode == false && autocompArr == "both") { return [] }
          let res = autocompArr == "both" ? songsAndPlaylists : autocompArr == "playlists" ? allPlaylists : []

          if (artistMode == false) {
            res = res.filter(song => { //find matches
                return song.filename.toLowerCase().includes(input.toLowerCase()) //fuck regex we doin includes
            })
          } else {
            res = res.filter(song => { //find matches
                return song.tag.artist.toLowerCase().includes(input.toLowerCase()) //fuck regex we doin includes
            })
          }
          
          res = res.filter(song => { //filter out things already in playlist to avoid duplicates
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
          
          //if specialmode or playlist only mode then return full results, otherwise first 10
          return specialMode == true || autocompArr == "playlists" || artistMode == true ? res : res.slice(0, 10)
        },
        onUpdate: (results, selectedIndex) => { 
            if (selectedIndex > -1) { updatePreview(results[selectedIndex], false)} //update the song preview
        },
        onSubmit: result => { //final pick
            autocompleteSubmit(result, true)
        },
        autoSelect: true,
        getResultValue: result => {
            let final = utils.getExtOrFn(result.filename).fn
            let res = autocompArr == "both" ? songsAndPlaylists : autocompArr == "playlists" ? allPlaylists : []

            return `<span index="${res.indexOf(result)}">${final}${result.type == "playlist" && autocompArr == "both" ? ` (Playlist)` : ""}</span>`
        } //show the filename in the result
      })
      mainsearch.destroy = () => {autocompleteDestroy(mainsearch)}
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
    specialMode = specialMode == true ? false : true
}

//playlist only mode
function playlistOnlyToggle() {
    let com = document.getElementById("com")
    let con = -1
    let onlyContainsPlaylists = true
    for (let i = 0; i < currPlaylist.length; i++) {
        const song = currPlaylist[i];
        if (song.type == "song") {
            onlyContainsPlaylists = false;
            break;
        }
    }
    if (currPlaylist.length == 0 || unsavedChanges == false || onlyContainsPlaylists == true) {
        con = 0
    } else {
        let act = autocompArr == "both" ? "change to" : "exit from"
        con = dialog.showMessageBoxSync({
            message: `Do you wish to discard current playlist and ${act} Playlist only mode?`,
            type: "question",
            buttons: [`Discard playlist and ${act} Playlist only mode`, "Cancel"],
            noLink: true
        })
    }
    if (con == 0) {
        if (onlyContainsPlaylists == false){discardPlaylist()}
        if (autocompArr == "both") {
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
    if (artistMode == false) {
        

        let disablepom = false
        if (autocompArr == "playlists") {
            disablepom  = dialog.showMessageBoxSync({
                message: "Searching by artist is not available in playlist only mode. What do you want to do?",
                type: "question",
                buttons: ["Exit playlist-only mode and search by artist", "Stay in playlist-only mode"],
                noLink: true
            })
            if (disablepom == 0){
                disablepom = true
                playlistOnlyToggle()
            } else {
                disablepom = false
            }
        } else {
            disablepom = true
        }
        if (disablepom == true) {
            btn.querySelector('.md-person_search').setAttribute("hidden", "true")
            artistMode = true

            if (allSongsAreTagged == false) {
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

        document.getElementById('input-placeholder').textContent = `Start typing a name of a ${autocompArr == "both" ? "song or playlist" : "playlist"}...`
    }
}

async function fetchMissingArtists() {
    let inp = document.getElementById('command-line-input')
    let btn = document.getElementById("mode-toggle")
    let sprog =  document.getElementById("sprog")
    sprog.style.width = `0`
    sprog.style.opacity = `100%`


    inp.setAttribute("disabled", "true")
    btn.setAttribute("disabled", "true")

    document.getElementById('input-placeholder').textContent = "Getting artist for each song, please wait..."

    for (let i = 0; i < songsAndPlaylists.length; i++) {
        var song = songsAndPlaylists[i];
        sprog.style.width = `${i / songsAndPlaylists.length * 100}%`
        if (song.tag == undefined) {
            song.tag = await getEXTINF(song.fullpath, song.filename, true, false)
        } else {
            continue;
        }
    }
    allSongsAreTagged = true
    sprog.style.width = `100%`
    setTimeout(() => {sprog.style.opacity = `0%`}, 500)
    setTimeout(() => {sprog.style.width = `0%`}, 1250)

    mainsearch.destroy()
    inp.removeAttribute("disabled")
    btn.removeAttribute("disabled")
    setupAutocomplete(autocompArr == "both" ? "song or playlist" : "playlist")
    
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
    if (empty == false) {
        if (song.index !== index || song.type !== type || update == true) {
            if (song.type == "song") {
                if (extraInfo !== undefined && extraInfo === true) { //fetch extra info if wanted
                    tag = await getEXTINF(song.fullpath, song.filename, true, false, true)
                } else {
                    tag = await getEXTINF(song.fullpath, song.filename, true, false)
                }
                //console.log(song)
            }  else if (song.type == "playlist") {
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
    if (update == true) {
        if (document.getElementById("song-preview").style.visibility == "hidden"){document.getElementById("song-preview").style.visibility = "visible"}
        document.getElementById("sp-cover").src = `${tag.cover}`
        document.getElementById("sp-title").textContent = tag.title
        document.getElementById("sp-artist").innerHTML = tag.artist
        document.getElementById("sp-album").textContent = tag.album
    
        if (extraInfo !== undefined && extraInfo === true) {
            let dur = `${Math.floor(Math.floor(tag.duration)/1000 / 60)}:${utils.zeropad(Math.floor(tag.duration/1000) % 60, 2)}` //get min and sec from duration, zeropad it

            document.getElementById("sp-extra").classList.remove("hidden-f")
            document.getElementById("spe-fullpath").textContent = utils.shortenFilename(song.fullpath, 40)
            document.getElementById("spe-fullpath").setAttribute("title", song.fullpath)
            document.getElementById("spe-genre").textContent = tag.extrainfo.genre
            document.getElementById("spe-format").textContent = tag.extrainfo.format
            document.getElementById("spe-duration").textContent = dur == "0:0" ? "Unknown" : dur
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

//album cover display popup
/**
 * show the cover of clicked song but big
 * @param {String} src path to album cover image
 */
function popCover(src) {
    let popBody = document.getElementById("coverpop-body")
    let popImg = document.getElementById("coverdisplay")
    document.getElementById("coverpop-close").onclick = () => {popBody.classList.add("hidden-f")}
    
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
    if (currPlaylist.length > 0 && unsavedChanges == true) {
        document.getElementById("command-line-input").blur()
        let con = dialog.showMessageBoxSync({
            message: "do you wish to discard current playlist?",
            type: "question",
            buttons: ["Discard playlist", "Cancel"],
            noLink: true
        })
        if (con == 0) {
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
    if (autocompArr == "playlists"){document.getElementById("com").click()}
}


function savePlaylistPrompt() {
    if (currPlaylist.length > 0) {
        let onlyContainsPlaylists = true
        for (let i = 0; i < currPlaylist.length; i++) {
            const song = currPlaylist[i];
            if (song.type == "song") {
                onlyContainsPlaylists = false;
                break;
            }
        }
        if (onlyContainsPlaylists && autocompArr == "both") {
            let con = -1
            con = dialog.showMessageBoxSync({
                message: "Do you want to save this as a combined playlist?",
                detail: `Combined Playlists can only consist of other playlists, but if if any of the playlists update (you add a new song), you can easily re-make/update the generated playlist to include all the new stuff.`,
                type: "question",
                buttons: ["Save as Combined Playlist", "Save as a normal Playlist"],
                noLink: true
            })
            if (con == 0) {
                document.getElementById("com").click()
            }
        }
        if (playlistName == "Untitled Playlist") {
            dialog.showMessageBoxSync({"message": "Please name your playlist first"})
        } else {
			if (autocompArr == 'playlists') {
				let cPlaylist = currPlaylist.map(p => {return {"filename": p.filename, "fullpath": p.fullpath, "relativepath": p.relativepath}})
				config.comPlaylists[`${config.maindir + slash + playlistName}.m3u`] = cPlaylist
				utils.saveConfig("./config.json", config)
			}
            if (playlistName == lastPlaylistName && savePath !== undefined) {
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
    let lines = getPlaylistContent()
    lines = removeDuplicatesFromPlaylist(lines)

    fs.writeFileSync(savePath, lines.join("\n"))
    
    document.getElementById("save").classList.add("btn-active")
    loadPlaylistsSidebar(editablePlaylists)
    setTimeout(() => {document.getElementById("save").classList.remove("btn-active")}, 1000)
}

function getPlaylistContent() {
    //console.log(currPlaylist)
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
            //console.log(relpath)

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
    //console.log(play)
    return play
}

function removeDuplicatesFromPlaylist(arr) {
    let finalarr = [...arr]
    let newarr = []
    let allfilenames = [...arr].filter(line => !line.startsWith("#EXTINF:"))

    for (let i = 0; i < allfilenames.length; i++) {// loop through all filenames
        const fn = allfilenames[i];
        if (!newarr.includes(fn)) {
            newarr.push(fn)
        } else {
            finalarr.splice((i*2)-1, 2) //remove i*2(because extinfs) -1 so we target extinf, 2 items, so extinf + song
        }
    }
    return finalarr
}

//add a song to the current playlist
async function addSong(songobj, refocus) {
    notReady(true)
    let tag = songobj.tag

    let songElem = document.createElement("div")
    let remElem = document.createElement("div")
    let moreElem = document.createElement("div")
    let id = Date.now().toString() 

    if (tag.coverobj !== false && songobj.type == "song") {
        fs.writeFileSync(`covers${slash}cover-${id}.${tag.coverobj.frmt}`, tag.coverobj.data)
    }
    let imgpath = ""
    if (songobj.type == "song") {
        imgpath = `covers/cover-${id}.${tag.coverobj !== false ? tag.coverobj.frmt : "png"}`
    } else if (songobj.type == "playlist") {
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

    moreElem.classList.add("songitem-button"/*, "hidden", "vertical-icon-minwidth"*/)
    moreElem.setAttribute("title", "more options")
    let mmfunction = (event) => {
        let opt = {event, buttons: []}

        if (songobj.type == "playlist") { //playlist specific
            opt.buttons.push({
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
            opt.buttons.push( 
                {   text: "Details",
                    run: () => {
                        updatePreview(songobj, false, true, true)
                    }},
                {   text: "View cover", 
                    run: () => {
                        popCover(imgpath)
                    }}/*,
                {   text: "Edit Tags", 
                    run: () => {
                        alert("placeholder for tag editor")
                    }}*/
            )
        }
        utils.summonMenu(opt)
    }
    moreElem.onclick = mmfunction
    songElem.oncontextmenu = mmfunction

    moreElem.innerHTML = `<i class="material-icons-round md-more_vert"></i>`


    remElem.classList.add("songitem-button")
    remElem.setAttribute("title", "Remove song from this playlist")
    remElem.innerHTML = `<i class="material-icons-round md-close"></i>`
    remElem.onclick = () => {
        notReady(true)
        if (currPlaylist.length == 1) { document.getElementById("song-preview").style.visibility = "hidden" }
        for (let i = 0; i < currPlaylist.length; i++) {
            const song = currPlaylist[i];
            if (songobj.fullpath == song.fullpath) {
                currPlaylist.splice(i, 1)
                break;
            }
        }
        if (currPlaylist.length == 0) {
            document.getElementById("openspan").style.display = "block"
        }
        if (songobj.type == "song"){
            try {fs.unlinkSync(`covers${slash}cover-${id}.${tag.coverobj.frmt}`)} catch(e){
                console.log("failed to delete cover, probably")
            }
        }
        songElem.remove()
    }
    /*if (songobj.type == "playlist") { //add a print
        //remElem.style.gridColumn = " 4 / 5"

        let printElem = document.createElement("div")
        printElem.classList.add("songitem-button")
        printElem.setAttribute("title", "See all songs in this playlist")
        printElem.innerHTML = `<i class="material-icons-round md-queue_music"></i>`
        printElem.onclick = () => {
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
        songElem.querySelector(".songitem-button-wrap").appendChild(printElem)

    }*/

    songElem.querySelector(".songitem-button-wrap").appendChild(moreElem)
    songElem.querySelector(".songitem-button-wrap").appendChild(remElem)
    if (currPlaylist.length == 0) {
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
        
        setTimeout(() => {s.removeAllRanges();
            setTimeout((refocus) => {
                if (refocus == true) { document.getElementById("command-line-input").focus() }
            }, 3, refocus)
        }, 10, refocus)
    }, 2, refocus)
    
    if (songobj.type == "song") {
        songobj.tag.cover = ""
        songobj.tag.coverobj.data = ""
    }

    currPlaylist.push(songobj)
}
//return the innerhtml for a songitem element
function generateSongitem(val) {
    let strongtag = val.strong !== undefined && val.strong == true ? ["<strong>", "</strong>"] : ["", ""];
    if (!fs.existsSync(val.coversrc)) {val.coversrc = ""};
    return `
    <div class="songitem-cover-wrap">
        <div class="songitem-cover-placeholder" style = "${val.coversrc !== "" ? "display: none": ""}"></div>
        <img class="songitem-cover cover-${val.coverid}" draggable="false" src="${val.coversrc}" onerror = "this.src = 'img/placeholder.png'" style = "${val.coversrc == "" ? "display: none": ""}"></img>
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
async function gen() {
    let alldirs = []
    let gprog =  document.getElementById("gprog") //generate progress bar
    let genbutton = document.getElementById("gen")
    genbutton.setAttribute("disabled","true")
    gprog.style.width = `0`
    gprog.style.opacity = `100%`

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
        gprog.style.width = `${i / alldirs.length * 100}%`
    }
    gprog.style.width = `100%`
    setTimeout(() => {gprog.style.opacity = `0%`}, 500)
    setTimeout(() => {gprog.style.width = `0%`}, 1250)
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
        songext = utils.getExtOrFn(song).ext 
        if (basedir.replace(folder, "").length > 0) { //stupid fucking piece of shit
            appendname = basedir.replace(folder, "").replace(slash, "")
            if (appendname.length > 0) {appendname += pslash}
        }
        //if the song extension is in allowed list
        if (config.exts.includes(songext)) {
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
/**
 * read song file to get metadata
 * @param {String} song full path to file
 * @param {String} onlysong relative path to file (no folder)
 * @param {Boolean} returnObj if true, return full object instead of EXTINF string
 * @param {Boolean} skipCovers if true, skip fetching covers (faster)
 * @param {Boolean} fetchExtraInfo if true, fetch extra info
 */
async function getEXTINF(song, onlysong, returnObj, skipCovers, fetchExtraInfo) {
    const metadata = await mm.parseFile(song, {"skipCovers": skipCovers, "duration": false})
    metadata.quality.warnings = metadata.quality.warnings.length //replace warnings array with just the number fo warnings
    //console.log("metadata: ",metadata)

    let extrainfo = {}

    var artist = metadata.common.artist == undefined ? "Unknown Artist" : metadata.common.artist
    const title = metadata.common.title == undefined ? onlysong : metadata.common.title
    const album = metadata.common.album == undefined ? "Unknown Album" : metadata.common.album
    const duration = metadata.format.duration == undefined || parseInt(metadata.format.duration) < 1 ? "000001" : metadata.format.duration.toFixed(3).replaceAll(".","")

    if (metadata.common.artists !== undefined && metadata.common.artists.length > 1) {
        artist = metadata.common.artists.join(" / ")
    }
   if (fetchExtraInfo !== undefined && fetchExtraInfo === true) {
        let lstat =  fs.lstatSync(song)
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
        return {artist, title, album, duration, cover, extinf, coverobj, extrainfo}
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
    for (let i = 0; i <Object.keys(config.comPlaylists).length; i++) {
        const complaylist =Object.keys(config.comPlaylists)[i];
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
        songs.push({ filename, "fullpath": fp, "relativepath": fp.replaceAll(config.maindir + slash, "")})
    })
    songs = songs.filter(song => {
        let ext = utils.getExtOrFn(song.filename).ext
        if (config.exts.includes(ext.toLowerCase(ext)) ) {
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
        autocompArr == "both"
        setupAutocomplete("song or playlist")
    } else {
        document.getElementById("input-placeholder").innerHTML = "No songs found in this folder, check settings"
    }

    //playlists
    playlists = []
    walk.filesSync(config.maindir, (basedir, filename) => {
        let fp = basedir + slash + filename
        playlists.push({ filename, "fullpath": fp, "relativepath": fp.replaceAll(config.maindir + slash, "")})
    })
    playlists = playlists.filter(playlist => {
        let ext = utils.getExtOrFn(playlist.filename).ext
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
    editablePlaylists = fs.readdirSync(config.maindir).filter( //fetch teh maindir for user created playlists
        item => fs.lstatSync(config.maindir + slash + item).isFile()
    ).filter(item => { //filter out anything other than m3u
        let ext = utils.getExtOrFn(item).ext
        return ext.toLowerCase() == "m3u"
    }).map(item => { //fetch the playlist data from big songAndPlaylists object
        let fp = config.maindir + slash + item
        let p = {}
        for (let i = 0; i < songsAndPlaylists.length; i++) {
            const cp = songsAndPlaylists[i];
            if (cp.fullpath == fp) { p = cp; break; }
        }
		p.mode = config.comPlaylists[p.fullpath] !== undefined ? "com" : "new"
        return p }
    )
    loadPlaylistsSidebar(editablePlaylists)
    if (editablePlaylists.length > 0){document.getElementById("yourplaylistshr").style.display = "block"}

    console.log(editablePlaylists)
}

//load a playlist, "playlist" is an object, mode is new or com
async function loadPlaylist(playlist, mode) {
	discardPlaylist()
	playlistName = utils.getExtOrFn(playlist.filename).fn
	lastPlaylistName = playlistName
	savePath = playlist.fullpath

	let titleh = document.getElementById("titleh")

	if (mode == "com") {
		if (autocompArr == "both"){document.getElementById("com").click()} //turn on playlist only mode

		let loadPlaylists = config.comPlaylists[playlist.fullpath] //array of playlists this is made of
		for (let i = 0; i < loadPlaylists.length; i++) { //for each playlist we wanna add
			const pl = loadPlaylists[i];
			//for loop find the desired playlist, push to currPlaylist and break from for loop
			for (let j = 0; j < allPlaylists.length; j++) {
				const compp = allPlaylists[j];
				if (compp.fullpath == pl.fullpath) {
					await autocompleteSubmit(compp, false, false)
					break;
				}
			}
		}
	} else {
		let onlysongs = playlist.songs.filter(s => !s.includes("#EXTINF"))
		for (let i = 0; i < onlysongs.length; i++) {
			const song = onlysongs[i];
			//for loop find a song, push to currPlaylist and break from for loop
			for (let j = 0; j < songsAndPlaylists.length; j++) {
				const compsong = songsAndPlaylists[j];
				if (compsong.relativepath == song) {
					await autocompleteSubmit(compsong, false, false)
					break;
				}
			}
		}
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
        let opts = {
            coverid: "",
            coversrc: "",
            title: `${playlist.tag.title}`,
            artist: `${playlist.songs.length / 2} Songs`,
            album: playlist.tag.album,
            filename: playlist.filename,
            strong: true
        }
        pElem.style.gridTemplateColumns = "0rem minmax(0%, 100%) min-content"
        pElem.innerHTML = generateSongitem(opts)

		if (playlist.mode == "com") {
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
				if (autocompArr == "playlists"){document.getElementById("com").click()}
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
            if (currPlaylist.length == 0 || unsavedChanges == false) {
                con = 0
            } else {
                con = dialog.showMessageBoxSync({
                    message: `do you wish to discard current playlist and load '${playlist.filename}'?`,
                    type: "question",
                    buttons: [`Discard playlist and Load '${playlist.filename}'`, "Cancel"],
                    noLink: true
                })
            }
            if (con == 0) {
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
    if (unsavedChanges == false) {
        if (playlists.length > 0) {

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

//progress bar buttons

/**
 * progress bar using border-bottom
 * @param {String} id id of button
 * @param {Number} percent 0-100 percent of the progress bar
 * @param {String} col1 normal color
 * @param {String} col2 progress bar color
 * @param {Number} width width of the border in px
 */
/*
function matterButtonBorder(id, percent, col1, col2, width) {
    let b = document.getElementById(id)

    let grad = `-webkit-linear-gradient(left, ${col2} ${percent}%, ${col1} ${percent}%, ${col1} 100%)`

    b.style = `-webkit-border-image: ${grad} 0 0 100% 0/0 0 3px 0 stretch;`
    b.style.borderBottomWidth = `${width}px`

    b.style.borderTopColor = `${col1} !important;`


}*/
