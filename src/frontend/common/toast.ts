import { toast as t } from "@zerodevx/svelte-toast";

const opts = {
    reversed: true,
    initial: 0,
    next: 1,
    duration: 4250
}

export const toast = {
    success: (text: string = "Success!") => {
        t.push(text, { ...opts, theme: { '--toastBarBackground': '#a3be8c'} })
    },
    info: (text: string = "Info") => {
        t.push(text, { ...opts, duration: 3000, pausable: true })
    }
}