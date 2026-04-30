import fs from 'node:fs'
import nodepath from 'node:path'

/**
 * Shorten a string to <start>...<end> format
 */
export function shortenFilename(str: string, len: number): string {
    if (str.length <= len) return str;

    const halfSize = Math.floor(len / 2) - 1;
    const firstHalf = str.slice(0, halfSize);
    const secondHalf = str.slice(-halfSize);

    return `${firstHalf}...${secondHalf}`;
}

/**
 * fix quotes so they can be put in title html attribute. replaces " with &quot;
 */
export function fixQuotes(str: string) {
    return str.replaceAll('"', "&quot;")
}

/**
 * Get either the extension or filename from a "filename.ext" format
 */
export function getExtOrFn(filename: string) {
    const parts = filename.split(".");
    const ext = parts.pop() ?? "";
    const fn = parts.join(".");

    return { fn, ext };
}
export function zeropad(number: number, finalWidth: number, customCharacter = '0') {
    const str = String(number);
    return str.length >= finalWidth
        ? str
        : customCharacter.repeat(finalWidth - str.length) + str;
}

/**
 * Math.round but behaves correctly when rounding floating point numbers
 * it does this by first converting the numbers to integers, rounding them and then dividing them back to floating points.
 * @param number number to round
 * @param precision the decimal points precision. default it 2
 * @returns the rounded number with correct decimal points
 */
export function precisionRound(number: number, precision = 2) {
    let factor = Math.pow(10, precision);
    return Math.round(number * factor) / factor;
}

//web dev simplified: other.js utils https://github.com/WebDevSimplified/js-util-functions
export function randomNumberBetween(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}


//TODO what if user wants to add more classes?? will it work? test

/**
 * Create a DOM element given an object of properties
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
    type: K,
    options: Record<string, any> = {}
): HTMLElementTagNameMap[K] {
    const element = document.createElement(type);

    Object.entries(options).forEach(([key, value]) => {
        if (key === "class") {
            element.classList.add(value);
            return;
        }

        if (key === "dataset" && value) {
            Object.entries(value).forEach(([dataKey, dataValue]) => {
                element.dataset[dataKey] = dataValue as string;
            });
            return;
        }

        if (key === "text") {
            element.textContent = value;
            return;
        }

        if (key === "innerHTML") {
            element.innerHTML = value;
            return;
        }

        element.setAttribute(key, value as string);
    });

    return element;
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

export type MenuItem = {
    text: string;
    run: (ev: MouseEvent) => void;
};

export type MenuOptions = {
    menuItems: MenuItem[];
    event?: MouseEvent | null;
};

/**
 * Generate a material design esque more menu / dropdown thingy
 * 
 * @example
 * elem.onclick = (event) => {
 *   summonMenu({
 *     event,
 *     menuItems: [
 *       { text: "Details", run: () => updatePreview(songobj) },
 *       { text: "Edit Tags", run: () => alert("tag editor") }
 *     ]
 *   });
 * }
 */
export function summonMenu(options: MenuOptions, passedEvent = options.event) {
    if (!passedEvent) return;

    document.onclick = undefined;
    const menu = document.getElementById("moremenu") as HTMLElement;
    const list = menu.querySelector("ul")!;

    // Clear and rebuild list
    list.innerHTML = options.menuItems.length > 0 ? "" : `<li class="mm-li">No options</li>`;

    options.menuItems.forEach((item) => {
        const li = document.createElement("li");
        li.className = "mm-li";
        li.textContent = item.text;
        li.onclick = item.run as any;
        li.onmouseup = () => menu.classList.add("hidden");
        list.appendChild(li);
    });

    menu.classList.remove("hidden");

    // Positioning logic
    const topLimit = window.innerHeight - menu.clientHeight;
    const leftPos = passedEvent.clientX;
    const topPos = Math.min(passedEvent.clientY, topLimit);

    menu.style.left = `${leftPos}px`;
    menu.style.top = `${topPos}px`;

    // Auto-hide listener
    setTimeout(() => {
        document.onclick = (e: MouseEvent) => {
            if (!e.composedPath().includes(menu)) {
                menu.classList.add("hidden");
                document.onclick = undefined;
            }
        };
    }, 0);
}

// from utils.ts

/**
 * save the config file
 * @param filename path to config file (can be relative)
 * @param config the object/json you want to write in config
 * @param minified whether to minify the json or nah
 * @param extraMessage optional extra message to log when saving config
 */
export function saveConfig(
    filename: string,
    config: unknown,
    minified = false,
    extraMessage = ""
): void {
    const data = minified
        ? JSON.stringify(config)
        : JSON.stringify(config, null, 2);

    fs.writeFileSync(filename, data);

    const logSuffix = extraMessage ? ` [${extraMessage}] ` : "";
    console.log(`saved config${logSuffix}`);
}

/**
 * Initialize / Load config file. 
 * If the file doesn't exist, it creates it using the provided default schema.
 */
export function initOrLoadConfig<T extends object>(filename: string, defaultSchema: T): T {
    if (fs.existsSync(filename)) {
        const fileContent = fs.readFileSync(filename, { encoding: "utf-8" });
        // Spread schema then file content to ensure any missing keys are filled by defaults
        return { ...defaultSchema, ...JSON.parse(fileContent) };
    }

    fs.writeFileSync(filename, JSON.stringify(defaultSchema, null, 2));
    return defaultSchema;
}