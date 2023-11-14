
export type tEvent = 'pub_local' | 'pub_cloud' | 'update'
export const wr = (cb: any) => { try { return cb() } catch { return null } }
export const f = (n: number, f = 2) => Number(n.toFixed(f))
export const roughSizeOfObject = (object: any) => {

    var objectList = []
    var stack = [object]
    var bytes = 0

    while (stack.length) {

        var value = stack.pop()

        if (typeof value === 'boolean') {
            bytes += 4
        }
        else if (typeof value === 'string') {
            bytes += value.length * 2
        }
        else if (typeof value === 'number') {
            bytes += 8
        }
        else if
            (
            typeof value === 'object'
            && objectList.indexOf(value) === -1
        ) {
            objectList.push(value)

            for (var i in value) {
                stack.push(value[i])
            }
        }

    }

    return bytes

}

/**
 * NOT YET TESTED THIS METHOD
 */
export class InstanceManager {

    objects: any = {}
    callbacks: any = [] /** Must be array of cbs **/
    states: any = {}

    constructor() {
        //
    }

    setObject = (name: string, classInstance: any) => {

        this.objects[name] = classInstance

    }

    getObject = (name: string) => {

        return this.objects[name] ?? null

    }

    onStateChange = (name: string, cb: any) => { /** Should provide initial states? **/

        this.callbacks.push([name, cb])
        cb(this.states[name] ?? {})

    }

    setState = (name: string, field: string, value: any) => {

        if (!this.states.hasOwnProperty(name)) {
            this.states[name] = {}
        }

        this.states[name][field] = value

        for (const l of this.callbacks) {
            if (l[0] === name) { l[1](this.states[name] ?? {}) }
        }

    }

    getState = (name: string) => {
        return this.states[name] ?? {}
    }

}

export const authorize = (req: any) => {

    if (req.hasOwnProperty('headers')) {

        const { verified, role } = req.headers

        const roles = ['level-1', 'level-2', 'level-3', 'level-4', 'level-5']

        if (typeof verified === 'string' && verified === 'yes') {

            if (typeof role === 'string' && roles.includes(role)) {

                try {

                    const { project, name } = req.headers

                    return {
                        proj: project,
                        user: name,
                        level: roles.findIndex((s) => s === role) + 1,
                    }

                } catch { }

            }

        }

    }

    throw new Error('Not Authorized!')

}