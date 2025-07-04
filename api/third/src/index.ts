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

        console.log(req.headers)

        const key = 'devices'

        if (cache.has(key)) return cache.get(key)

        const { data: { devices } } = await axios.request({
            method: 'get',
            maxBodyLength: Infinity,
            url: 'https://api.pitunnel.com/devices',
            auth: { username: pi_token, password: '' },
        })

        console.log(devices)

        if (typeof devices === 'object' && Array.isArray(devices)) {

            cache.set(key, devices, 5)
            return devices

        } else return []

    })

    API.on('device', async (req) => {

        const { device_id } = req.query
        let param = qs.stringify({ 'device_id': device_id })

        const { data: { device_info } } = await axios.request({
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://api.pitunnel.com/device_info',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            auth: { username: pi_token, password: '' },
            data: param,
        })

        console.log(device_info)

        return device_info

    })

})