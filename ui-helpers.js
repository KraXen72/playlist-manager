const fs = require('fs')
const utils = require('./node_modules/roseboxlib/utils.js')

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

module.exports = { generateSongitem, autocompleteDestroy }
