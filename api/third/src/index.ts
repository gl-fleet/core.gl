import { Host } from 'unet'
import { decodeENV, Safe, Now, log } from 'utils'

import NodeCache from "node-cache"
import axios from 'axios'
import qs from 'qs'

const { name, version, mode, ports } = decodeENV()

log.success(`"${name}" <${version}> module is running on "${process.pid}" / [${mode}] 🚀🚀🚀\n`)

Safe(() => {

    const API = new Host({ name, port: Number(ports[0]) })

    const cache = new NodeCache()
    const pi_token = "pitunkey_p2S2HPO5qonUyEc1aGxfI4Yo3MaPnhyj"

    API.on('devices', async (req) => {

        const key = 'devices'

        const { proj, type, name, level }: any = req.user

        if (cache.has(key)) return cache.get(key)

        const { data: { devices } } = await axios.request({
            method: 'get',
            maxBodyLength: Infinity,
            url: 'https://api.pitunnel.com/devices',
            auth: { username: pi_token, password: '' },
        })

        if (typeof devices === 'object' && Array.isArray(devices)) {

            // Example display_name: 'HLV796.VMP.MP'
            const filtered = devices.filter(({ display_name }) => proj === '*' || proj === display_name.split('.')[1])

            cache.set(key, filtered, 5)
            return filtered

        } else return []

    }, true, 2)

    API.on('device', async (req) => {

        const { device_id } = req.query
        let param = qs.stringify({ 'device_id': device_id })

        const { proj, level }: any = req.user

        const { data: { device_info } } = await axios.request({
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://api.pitunnel.com/device_info',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            auth: { username: pi_token, password: '' },
            data: param,
        })

        // Hide VNC level < 4
        console.log(device_info)

        return device_info

    }, true, 2)

})