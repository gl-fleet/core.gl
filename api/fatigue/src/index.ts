import { Host } from 'unet'
import { decodeENV, Safe, Now, log } from 'utils'

const { name, version, mode, ports } = decodeENV()

log.success(`"${name}" <${version}> module is running on "${process.pid}" / [${mode}] 🚀🚀🚀\n`)

Safe(() => {

    const API = new Host({ name, port: Number(ports[0]) })

    let memory: any = {
        query: null,
        body: null,
        last: null,
    }

    API.on('select', () => memory)

    API.on('insert', ({ query, body }) => {

        memory.query = query
        memory.body = body
        memory.last = Now()

        return 'done'

    })

})