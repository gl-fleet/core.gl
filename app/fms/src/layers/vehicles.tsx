import { React, Row, Col } from 'uweb'
import { AsyncWait, Safe } from 'utils/web'

import { Vehicles } from '../hooks/vehicle'
import { parseLocation } from '../hooks/helper'

const { useEffect, useState } = React

export default (cfg: iArgs) => {

    useEffect(() => {

        const vcs = new Vehicles(cfg.MapView)
        const dms = 100

        cfg.core_collect.get("get-enums", { type: 'location.now' }).then(async (ls: any) => {

            for (const location of ls) {

                const parsed = JSON.parse(location.value)
                const obj = parseLocation(parsed)

                if (obj.project && obj.type && obj.name) {

                    await AsyncWait(dms)
                    const key = `${obj.project}.${obj.type}.${obj.name}`
                    vcs.live_update(obj)

                    cfg.core_collect.on(key, (loc) => vcs.live_update(parseLocation(loc)))

                }

            }

        }).catch(console.error)

    }, [])

    return null

}