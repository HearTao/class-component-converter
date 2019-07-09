export function some<T>(
    items: ReadonlyArray<T> | null | undefined,
    cb: (v: T) => boolean
): boolean {
    return !!(items && items.some(cb));
}

export function isDef<T>(v: T | undefined): v is T {
    return v !== undefined && v !== null;
}

export function append<T>(to: T[] | undefined, item: T | undefined): T[] {
    if (!isDef(item)) return to || [];
    if (!isDef(to)) return [item];
    to.push(item);
    return to;
}

export function not<P extends any[]>(
    cb: (...args: P) => boolean
): (...args: P) => boolean {
    return (...args: P) => {
        return !cb(...args);
    };
}
