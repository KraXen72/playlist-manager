const electron = require('@electron/remote')
const dialog = electron.dialog
const utils = require('./node_modules/roseboxlib/utils.js')
const slash = process.platform === 'win32' ? "\\" : "/"

//settings
function initSettings(config) {
	let body = document.getElementById("settings-body")
	//closeSettings()
	if (body.style.display !== "block") {
		body.style.display = "block"
		document.getElementById("coverpop-body").classList.add("hidden-f") //hide previous popup if there was one
		document.getElementById('settings-close').onclick = closeSettings
		document.getElementById("settings-submit").onclick = () => saveSettings(config)

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
function saveSettings(config) {
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

module.exports = { initSettings, closeSettings, saveSettings, importSettings, addPill, fillSettingPills, pickFolderAndFillInput }
