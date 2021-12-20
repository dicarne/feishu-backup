export function stringNullIsDefault(str:string, defaultString: string) {
    if(str === null || str === undefined || str === '')
        return defaultString
    return str
}