import { log } from 'utils'

export const execSync = ({ alias = '', args = {} }, cb: any) => {

    const t = {
        alias,
        start: Date.now(),
        end: 0,
        in: args,
        out: null,
        err: '',
    }

    try {

        t.out = cb(t)

    } catch (err: any) {

        log.error(`[${alias}.execSync] -> ${err.message}`)
        t.err = err.message

    } finally {

        t.end = Date.now()
        return t

    }

}

export const execAsync = async ({ alias = '', args = {} }, cb: any) => {

    const t = {
        alias,
        start: Date.now(),
        end: 0,
        in: args,
        out: null,
        err: '',
    }

    try {

        t.out = await cb(t)

    } catch (err: any) {

        log.error(`[${alias}.execSync] -> ${err.message}`)
        t.err = err.message

    } finally {

        t.end = Date.now()
        return t

    }

}

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