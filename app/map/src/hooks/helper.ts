
export const AddMeta = () => {

    const low = document.documentElement.clientWidth < 1024 ? '0.75' : '1'
    const meta = document.createElement('meta')
    meta.name = "viewport"
    meta.content = `width=device-width, user-scalable=yes, initial-scale=1.0, maximum-scale=${low}, minimum-scale=${low}`
    document.getElementsByTagName('head')[0].appendChild(meta)

}

export class Persist {

    cbs: any = []

    constructor() {

        window.addEventListener("storage", (event) => this.notify(event.key, event.newValue))

    }

    set = (key: string, value: string | null) => {

        localStorage.setItem(key, value === null ? '' : value)
        this.notify(key, value)

    }

    get = (key: string) => {

        return localStorage.getItem(key)

    }

    notify = (key: string | null, value: string | null) => {

        this.cbs.map(([ki, cb]: any) => {
            try { ki === key && cb(value) } catch { }
        })

    }

    on = (key: string, cb: (value: string | null) => any) => {

        this.cbs.push([key, cb])

    }

}