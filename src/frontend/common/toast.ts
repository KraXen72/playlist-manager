import { toast as t } from "@zerodevx/svelte-toast";

const opts = {
    reversed: true,
    initial: 0,
    next: 1,
    duration: 5000
}

export const toast = {
    success: (text: string = "Success!") => {
        t.push(text, { theme: { '--toastBarBackground': '#a3be8c'}, ...opts })
    },
    info: (text: string = "Info") => {
        t.push(text, opts)
    }
}