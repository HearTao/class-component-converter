export type NotNull<T> = Exclude<T, undefined | null>;

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

export function or<P extends any[]>(
    ...funcs: Array<(...args: P) => boolean>
): (...args: P) => boolean {
    return (...args: P) => {
        return funcs.some(func => func(...args));
    };
}

export function cast<T, U extends T>(value: T, cb: (v: T) => v is U): U {
    if (!cb(value)) {
        throw new Error('invalid cast');
    }
    return value;
}
