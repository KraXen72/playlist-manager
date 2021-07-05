const fs = require('fs');
const slash = process.platform === 'win32' ? "\\" : "/"

/**
 * shorten a string to <start of string>...<end of string> format
 * @param {String} str String to shorten
 * @param {Number} len length of characters to shorten to
 */
function shortenFilename(str, len) { //turn a long string to start of string...end of string
    if (str.length > len) {
        let halfsize = Math.floor(len/2)-1 //the final size for each half
        let firsthalf = str.slice(0, (str.length/2)+1)
        let secondhalf = str.slice((str.length/2), str.length)

        //trim first half
        if (firsthalf.length > halfsize) { firsthalf = firsthalf.slice(0, halfsize)}
        //trim second half
        if (secondhalf.length > halfsize) {secondhalf = secondhalf.slice(secondhalf.length-halfsize, secondhalf.length+1)}

        return firsthalf+"..."+secondhalf
    } else {return str}
}

/**
 * initialize / Load config file. rememer to modify this to init the way you want
 * @param {String} filename config.json recommended but filename of the config file.
 */
function initOrLoadConfig(filename) { //initialize config.json
    let config = {}

    if (fs.existsSync(filename)) {
        config = JSON.parse(fs.readFileSync(filename))
    } else {
        config = {
            "maindir": "",
            "exts": ["mp3"], 
            "ignore": [],
            "comPlaylists": {}
        }
        fs.writeFileSync(filename, JSON.stringify(config, null, 2))
    }
    return config
}

/**
 * save the config file
 * @param {String} filename path to config file (can be relative)
 * @param {Object} config the object/json you want to write in config 
 */
function saveConfig(filename, config) { //save config.json
    fs.writeFileSync(filename, JSON.stringify(config, null, 2))
    console.log("saved config")
}

/**
 * fix quotes so they can be put in title html attribute. replaces " with &quot;
 * @param {String} str the string you want to fix quotes in
 */
function fixQuotes(str) { //escape quotes when put in title attribute for example
    return str.replaceAll('"', "&quot;")
}

/**
 * clear a Folder - delete all files (NOT FOLDERS) in a folder
 * @param {String} path path to folder to clear (can be relative)
 */
function clearFolder(path) { //delete all files in a folder
    let files = fs.readdirSync(path).filter(f => fs.lstatSync(path + slash + f).isFile() )
    files.forEach(f => {
        fs.unlinkSync(path + slash + f)
    })
}

/**
 * get either the extention or filename from a "filename.ext" format
 * @param {String} filename a string in "filename.ext" format
 * @returns {Object} {filename, ext}
 */
function getExtOrFn(filename) { //get the extension or filename from "filename.ext" format
    let splitarr = filename.split(".")
    let ext = splitarr[splitarr.length - 1]
    let fn = splitarr.slice(0, splitarr.length - 1).join(".")
    return {fn, ext}
}

function zeropad(number, finalWidth, customCharacter) {
    customCharacter = customCharacter || '0';
    number = number + '';
    return number.length >= finalWidth ? number : new Array(finalWidth - number.length + 1).join(customCharacter) + number;
}

//generate a material design esque more menu / dropdown thingy
/*
requires html setup defined in roseboxlib.css

usage:
elem.onclick = (event) => {
    let opt = {event, buttons: [
        {   text: "Details",
            run: () => {
                updatePreview(songobj, false, true, true)
            }},
        {   text: "Edit Tags", 
            run: () => {
                alert("placeholder for tag editor")
            }}
    ]}
    summonMenu(opt)
}

*/
function summonMenu(options) {
    document.onclick = ""
    let menu = document.getElementById("moremenu")
    menu.querySelector("ul").innerHTML = ""

    if (options.buttons.length > 0) {
        for (let i = 0; i < options.buttons.length; i++) {
            const btn = options.buttons[i];
            let btne = document.createElement("li")
            btne.classList.add("mm-li")
            btne.textContent = btn.text
            btne.onclick = btn.run
            btne.onmouseup = () => {document.getElementById("moremenu").classList.add("hidden")}
            menu.querySelector("ul").appendChild(btne)
        }
    } else {
        menu.querySelector("ul").innerHTML = `<li class="mm-li">Invalid menu, no buttons defined</li>`
    }
   
    menu.classList.remove("hidden")
    menu.style.left = `${options.event.clientX}px`
    //always fit the menu on screen: if the diff of posY and windowheight is less than menuheight, just put it to windowheight - menuheight
    menu.style.top = `${window.innerHeight - options.event.clientY < menu.clientHeight ? 
    window.innerHeight - menu.clientHeight : options.event.clientY}px`

    setTimeout(() => { //put it into an instant settimeout so this more button click doesen't trigger it
        document.onclick = (event) => { //hide the menu again if i click away
            if (!event.path.includes(menu)) {
                menu.classList.add("hidden")
                document.onclick = ""
            }
        }
    }, 0)
}

module.exports = {shortenFilename, initOrLoadConfig, saveConfig, fixQuotes, clearFolder, getExtOrFn, zeropad, summonMenu}