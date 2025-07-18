import { Host } from 'unet'
import { decodeENV, Safe, Now, log } from 'utils'

import NodeCache from "node-cache"
import Jimp from "jimp"

const { name, version, mode, ports } = decodeENV()

log.success(`"${name}" <${version}> module is running on "${process.pid}" / [${mode}] 🚀🚀🚀\n`)

const w = 640
const h = 480

Safe(() => {

    const API = new Host({ name, port: Number(ports[0]) })
    const cache = new NodeCache()

    API.on('select', () => {

        const keys = cache.keys().reverse()
        log.info(`[Cache.keys] ${keys.length}`)
        return keys.map(key => cache.get(key)).filter(e => e)

    })

    API.on('insert', async ({ body }) => {

        let notify = false

        await Promise.all(body.map(async (e: any) => {

            if (cache.has(e.alarmId)) return null
            else notify = true

            log.info(`[Cache.set] ${e.alarmId}`)

            const paths = e.mediaPath.split(';')
            const img_paths = paths.filter((p: string) => p.indexOf('.jpg') !== -1)
            const vid_paths = paths.filter((p: string) => p.indexOf('.mp4') !== -1)

            const image = await Jimp.read(img_paths[0])
            const thumbnail = await image.resize(w / 8, h / 8).quality(75).getBase64Async(Jimp.MIME_JPEG)

            return cache.set(e.alarmId, {

                key: e.alarmId,
                id: e.plateNo,
                desc: e.alarmTypeDescription.replace('level', 'level '),
                thumb: thumbnail,
                imgs: img_paths,
                vids: vid_paths,
                longitude: e.longitude,
                latitude: e.latitude,
                angle: e.angle,
                speed: e.speed,
                date: e.createDate,

            }, 60 * 10)

        }))

        notify && API.emit('select', true)
        return 'done'

    })

})