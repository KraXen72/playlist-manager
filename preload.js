// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

const electron = require('electron').remote
const dialog = electron.dialog
var maindir

window.addEventListener('DOMContentLoaded', () => {
    console.log("loaded")
    document.getElementById("folder-open").addEventListener("click", selectfolder)
})

async function selectfolder() {
    pick = await dialog.showOpenDialog({properties: ['openDirectory']})
    console.log(pick)
    if (pick.canceled == false) {
        console.log("didn't cancel")
        maindir = pick.filePaths[0]
        document.getElementById("selected-folder").innerText = shortenFilename(maindir, 40)
    }
    console.log(maindir)
}

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