// formatting utils
// from web dev simplified utils: formatters.js https://github.com/WebDevSimplified/js-util-functions

const CURRENCY_FORMATTER = new Intl.NumberFormat(undefined, {
    currency: "USD",
    style: "currency",
})
const DIVISIONS = [
    { amount: 60, name: "seconds" },
    { amount: 60, name: "minutes" },
    { amount: 24, name: "hours" },
    { amount: 7, name: "days" },
    { amount: 4.34524, name: "weeks" },
    { amount: 12, name: "months" },
    { amount: Number.POSITIVE_INFINITY, name: "years" },
]
const RELATIVE_DATE_FORMATTER = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })
const COMPACT_NUMBER_FORMATTER = new Intl.NumberFormat(undefined, { notation: "compact" })
const NUMBER_FORMATTER = new Intl.NumberFormat(undefined)

/** format number as currency */
export function formatCurrency(number) {
    return CURRENCY_FORMATTER.format(number)
}
/** format number with 000 delimeters specified by locale */
export function formatNumber(number) {
    return NUMBER_FORMATTER.format(number)
}

/** format a long number in a short, human readable way: 9 188 209 => 9M */
export function formatCompactNumber(number) {
    return COMPACT_NUMBER_FORMATTER.format(number)
}

/**
 * format a difference in dates in a human-readable way
 * @param {Date} toDate desired date of action happening
 * @param {Date} fromDate from what date to count the difference, default now
 * @returns string of human-readable date
 */
export function formatRelativeDate(toDate, fromDate = new Date()) {
    let duration = (toDate - fromDate) / 1000

    for (let i = 0; i <= DIVISIONS.length; i++) {
        const division = DIVISIONS[i]
        if (Math.abs(duration) < division.amount) {
            return RELATIVE_DATE_FORMATTER.format(Math.round(duration), division.name)
        }
        duration /= division.amount
    }
}
