const fs = require('fs');
const slash = process.platform === 'win32' ? "\\" : "/"


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

function saveConfig(filename, config) { //save config.json
    fs.writeFileSync(filename, JSON.stringify(config, null, 2))
    console.log("saved config")
}

function fixQuotes(str) { //escape quotes when put in title attribute for example
    return str.replaceAll('"', "&quot;")
}

function clearFolder(path) { //delete all files in a folder
    let files = fs.readdirSync(path).filter(f => fs.lstatSync(path + slash + f).isFile() )
    files.forEach(f => {
        fs.unlinkSync(path + slash + f)
    })
}

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

module.exports = {shortenFilename, initOrLoadConfig, saveConfig, fixQuotes, clearFolder, getExtOrFn, zeropad}