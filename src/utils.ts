export function padStart(number: number | string, digits: number) {
    return number.toString().padStart(digits, "0");
}

export function timestampToString(timestampMs: number) {
    const date = new Date(timestampMs);

    const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
    ];

    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()} at ${padStart(date.getHours(), 2)}:${padStart(date.getMinutes(), 2)}`;
}

export function escapeXml(unsafe: string) {
    const pairs: [RegExp, string][] = [
        [/&/g, '&amp;'],
        [/</g, '&lt;'],
        [/>/g, '&gt;'],
        [/"/g, '&quot;'],
        [/'/g, '&apos;']
    ];

    for (let pair of pairs) {
        unsafe = unsafe.replace(...pair);
    }

    return unsafe;
}

export function toXmlDate(date: Date) {
    return `${date.getUTCFullYear()}${padStart(date.getUTCMonth() + 1, 2)}${padStart(date.getUTCDate(), 2)}${padStart(date.getUTCHours(), 2)}${padStart(date.getUTCMinutes(), 2)}${padStart(date.getUTCSeconds(), 2)}`;
}