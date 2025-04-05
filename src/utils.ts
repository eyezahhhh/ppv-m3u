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