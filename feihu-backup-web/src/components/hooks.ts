import { ref } from "vue";

export function useLocalStorage<T>(name: string, default_value: T) {
    const old = window.localStorage.getItem(name)
    const v = ref(old ? (JSON.parse(old) as T) : default_value)
    return {
        value: v,
        setValue: (newv: T) => {
            v.value = newv as any
            window.localStorage.setItem(name, JSON.stringify(newv))
        }
    }
}