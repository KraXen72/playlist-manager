// @ts-nocheck

//string manipulation & pmanager specific utils

/**
 * shorten a string to <start of string>...<end of string> format
 * @param {String} str String to shorten
 * @param {Number} len length of characters to shorten to
 */
export function shortenFilename(str, len) { //turn a long string to start of string...end of string
    if (str.length > len) {
        let halfsize = Math.floor(len / 2) - 1 //the final size for each half
        let firsthalf = str.slice(0, (str.length / 2) + 1)
        let secondhalf = str.slice((str.length / 2), str.length)

        //trim first half
        if (firsthalf.length > halfsize) { firsthalf = firsthalf.slice(0, halfsize) }
        //trim second half
        if (secondhalf.length > halfsize) { secondhalf = secondhalf.slice(secondhalf.length - halfsize, secondhalf.length + 1) }

        return firsthalf + "..." + secondhalf
    } else { return str }
}

/**
 * fix quotes so they can be put in title html attribute. replaces " with &quot;
 * @param {String} str the string you want to fix quotes in
 */
export function fixQuotes(str) { //escape quotes when put in title attribute for example
    return str.replaceAll('"', "&quot;")
}

/**
 * get either the extention or filename from a "filename.ext" format
 * @param {String} filename a string in "filename.ext" format
 * @returns {{fn: string, ext: string}} {filename, ext}
 */
export function getExtOrFn(filename) { //get the extension or filename from "filename.ext" format
    let splitarr = filename.split(".")
    let ext = splitarr[splitarr.length - 1]
    let fn = splitarr.slice(0, splitarr.length - 1).join(".")
    return { fn, ext }
}

export function zeropad(number, finalWidth, customCharacter) {
    customCharacter = customCharacter || '0';
    number = number + '';
    return number.length >= finalWidth ? number : new Array(finalWidth - number.length + 1).join(customCharacter) + number;
}

/**
 * Math.round but behaves correctly when rounding floating point numbers
 * it does this by first converting the numbers to integers, rounding them and then dividing them back to floating points.
 * @param {number} number number to round
 * @param {number} precision the decimal points precision. default it 2
 * @returns {number} the rounded number with correct decimal points
 */
export function precisionRound(number, precision = 2) {
    let factor = Math.pow(10, precision);
    return Math.round(number * factor) / factor;
}

//web dev simplified: other.js utils https://github.com/WebDevSimplified/js-util-functions
export function randomNumberBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

/**
 * sleep for x ms. use with await or .then()
 * @param {Number} duration ms to sleep for
 */
export function sleep(duration) {
    return new Promise(resolve => {
        setTimeout(resolve, duration)
    })
}

/**
 * remember cpu heavy tasks' results to not compute them unnecesarilly
 * @param {Function} cb callback function
 */
export function memoize(cb) {
    const cache = new Map()
    return (...args) => {
        const key = JSON.stringify(args)
        if (cache.has(key)) return cache.get(key)

        const result = cb(...args)
        cache.set(key, result)
        return result
    }
}

//array manipulation utils from web dev simplified: arrayUtils.js from https://github.com/WebDevSimplified/js-util-functions

/** first or first x items in given array */
export function first(array, n = 1) {
    if (n === 1) return array[0]
    return array.filter((_, index) => index < n)
}

/** last or last x items in given array */
export function last(array, n = 1) {
    if (n === 1) return array[array.length - 1]
    return array.filter((_, index) => array.length - index <= n)
}

/** get a random value from an array */
export function sample(array) {
    return array[randomNumberBetween(0, array.length - 1)]
}

/**
 * extract values for given key from array of objects
 * e.g. pluck(people, "name") if people is [..., {name: "Jerry"}] => [..., "Jerry"]
 * @param {Array} array the array of objects to pluck
 * @param {String} key the key to extract
 */
export function pluck(array, key) {
    return array.map(element => element[key])
}

/**
 * group array of objects by values
 * e.g. groupBy(people, "age") if people is [..., {age: 23}, {age: 17}] => {23: [...], 17: [...]}
 * @param {Array} array the array of objects
 * @param {String} key the key to which group by
 */
export function groupBy(array, key) {
    return array.reduce((group, element) => {
        const keyValue = element[key]
        return { ...group, [keyValue]: [...(group[keyValue] ?? []), element] }
    }, {})
}

//dom utils by web dev simplified from domUtils.js https://github.com/WebDevSimplified/js-util-functions

/**
 * add a global event listener, for example for all buttons
 * @param {String} type what to listent to, e.g. click
 * @param {String} selector what selector to listen to, for example ".btn"
 * @param {String} callback callback
 * @param {EventListenerOptions} options options for the eventlistener
 * @param {Element} parent what to add the eventlistener to, e.g. window. default is document
 */
export function addGlobalEventListener(
    type,
    selector,
    callback,
    options,
    parent = document
) {
    parent.addEventListener(
        type,
        e => {
            if (e.target.matches(selector)) callback(e)
        },
        options
    )
}

/** document.querySelector wrapper */
export function qs(selector, parent = document) {
    return parent.querySelector(selector)
}

/** document.querySelectorAll wrapper, returns js array instead of list */
export function qsa(selector, parent = document) {
    return [...parent.querySelectorAll(selector)]
}

//TODO what if user wants to add more classes?? will it work? test

/**
 * create a dom element given an object of properties
 * @param {String} type element type, e.g. "div"
 * @param {Object} options options for the element. like class, id, etc
 * @returns element
 */
export function createElement(type, options = {}) {
    const element = document.createElement(type)
    Object.entries(options).forEach(([key, value]) => {
        if (key === "class") {
            element.classList.add(value)
            return
        }

        if (key === "dataset") {
            Object.entries(value).forEach(([dataKey, dataValue]) => {
                element.dataset[dataKey] = dataValue
            })
            return
        }

        if (key === "text") {
            element.textContent = value
            return
        }

        if (key === "innerHTML") {
            element.innerHTML = value
            return
        }

        element.setAttribute(key, value)
    })
    return element
}


//pmanager / rosebox oriented utils

/**
 * given an instance of @trevoreyre/autocomplete-js it will destroy it. most importatnly, remove eventlisteners
 * assumes access to document.body
 * @param instance instance of Autocomplete from @trevoreyre/autocomplete-js
 */
export function autocompleteDestroy(instance) {
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

/**
 * generate a material design esque more menu / dropdown thingy
 * 
 * @see roseboxlib.css for required html markup
 * @see lib.js for usage example if needed
 * 
 * @param {{menuItems: {text: string, run: Function},event: Event | null}} options options for moremenu. menuItems is array of {text: "text", run: ()=>{}}, event is used to get client X and Y
 * @param {Event} passedEvent you can pass the event here if it's more convenient that in options 
*/
export function summonMenu(options, passedEvent) {
    if (passedEvent === undefined) { passedEvent = options.event } //fallback for how i used it before
    document.onclick = ""
    let menu = document.getElementById("moremenu")
    menu.querySelector("ul").innerHTML = ""

    if (options.menuItems.length > 0) {
        for (let i = 0; i < options.menuItems.length; i++) {
            const btn = options.menuItems[i];
            let btne = document.createElement("li")
            btne.classList.add("mm-li")
            btne.textContent = btn.text
            btne.onclick = btn.run
            btne.onmouseup = () => { document.getElementById("moremenu").classList.add("hidden") }
            menu.querySelector("ul").appendChild(btne)
        }
    } else {
        menu.querySelector("ul").innerHTML = `<li class="mm-li">Invalid menu, no menuItems defined</li>`
    }

    menu.classList.remove("hidden")
    menu.style.left = `${passedEvent.clientX}px`
    //always fit the menu on screen: if the diff of posY and windowheight is less than menuheight, just put it to windowheight - menuheight
    menu.style.top = `${window.innerHeight - passedEvent.clientY < menu.clientHeight ?
        window.innerHeight - menu.clientHeight : passedEvent.clientY}px`

    setTimeout(() => { //put it into an instant settimeout so this more button click doesen't trigger it
        document.onclick = (event) => { //hide the menu again if i click away
            if (!(event.composedPath?.() ?? event.path ?? []).includes(menu)) {
                menu.classList.add("hidden")
                document.onclick = ""
            }
        }
    }, 0)
}

/*
USAGE EXAMPLE
elem.onclick = (event) => {
    let opt = {event, menuItems: [
        {   text: "Details",
            run: () => {
                updatePreview(songobj, false, true, true)
            }},
        {   text: "Edit Tags", 
            run: () => {
                alert("placeholder for tag editor")
            }}
    ]}
    summonMenu(opt, event)
}
*/