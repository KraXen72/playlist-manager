const fs = require('fs');


function shortenFilename(str, len) {
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

function initOrLoadConfig(filename) {
    let config = {}

    if (fs.existsSync(filename)) {
        config = JSON.parse(fs.readFileSync(filename))
    } else {
        config = {
            "maindir": "",
            "exts": ["mp3"]
        }
        fs.writeFileSync(filename, JSON.stringify(config, null, 2))
    }
    return config
}

function saveConfig(filename, config) {
    fs.writeFileSync(filename, JSON.stringify(config, null, 2))
    console.log("saved config")
}

module.exports = {shortenFilename, initOrLoadConfig, saveConfig}