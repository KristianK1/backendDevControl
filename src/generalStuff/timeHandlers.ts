export function getCurrentTimeUNIX(): number {
    return new Date().getTime();
}

export function getCurrentTimeISO(): string {
    return new Date().toISOString();
}

export function ISOToUNIX(iso: string): number {
    return new Date(iso).getTime();
}

export function hasTimePASSED(iso: string): boolean {
    var unixTime = ISOToUNIX(iso);
    return unixTime < getCurrentTimeUNIX();
}

export function addDaysToCurrentTime(days: number): string {
    return new Date(getCurrentTimeUNIX() + 1000 * 3600 * 24 * days).toISOString();
}
