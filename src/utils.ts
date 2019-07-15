export type NotNull<T> = Exclude<T, undefined | null>;

export function some<T>(
    items: ReadonlyArray<T> | null | undefined,
    cb: (v: T) => boolean
): boolean {
    return !!(items && items.some(cb));
}

export function find<T>(
    items: ReadonlyArray<T> | null | undefined,
    cb: (v: T) => boolean
): T | undefined {
    return (items && items.find(cb)) || undefined;
}

export function isDef<T>(v: T | null | undefined): v is T {
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
    ...funcs: Array<(...args: P) => unknown>
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

export function length<T>(items: ReadonlyArray<T> | null | undefined): number {
    return (items && items.length) || 0;
}

export function first<T>(items: ReadonlyArray<T>): T {
    if (!items.length) {
        throw new Error('out of range');
    }
    return items[0];
}

export function firstOrUndefined<T>(items: ReadonlyArray<T>): T | undefined {
    if (!items.length) {
        return undefined;
    }
    return items[0];
}

export function assertDef<T>(v: T | undefined): T {
    if (!isDef(v)) {
        throw new Error('must be defined');
    }
    return v;
}

export function pickOut<T, U extends T>(
    items: ReadonlyArray<T>,
    cb: (v: T) => v is U
): [U[], T[]] {
    const r1: T[] = [];
    const r2: U[] = [];
    items.forEach(x => {
        if (cb(x)) {
            r2.push(x);
        } else {
            r1.push(x);
        }
    });
    return [r2, r1];
}

export function id<T>(v: T): T {
    return v;
}

export function match<T>(value: T) {
    let done: boolean = false;
    function task<U>(cb: (v: T) => U | undefined, recv: (v: U) => void) {
        if (!done) {
            const result = cb(value);
            if (result) {
                done = true;
                recv(result);
            }
        }
        return task;
    }
    return task;
}

export function push<T>(items: T[]) {
    return function(x: T) {
        items.push(x);
    };
}

export function mapDef<T, U>(
    v: T | undefined | null,
    cb: (v: T) => U
): U | undefined {
    if (isDef(v)) {
        return cb(v);
    }
    return undefined;
}
