export type Copy<T, P extends keyof T> = {
    [K in P]: T[K]
}

export function copy<T, P extends keyof T>(t: T, props: P[]) {
    const copy = {} as Copy<T, P>
    for (const prop of props) {
        let v = t[prop]

        if (typeof v === "function") v = v.bind(t)

        copy[prop] = v
    }
    return copy
}