import { React, Row, Col } from 'uweb'
import { AsyncWait, Safe } from 'utils/web'
import { maptalks } from 'uweb/maptalks'

const { useEffect, useState } = React

export default (cfg: iArgs) => {

    useEffect(() => {

        const bottomRightCompass = new maptalks.control.Compass({
            position: 'bottom-right',
        })

        console.log(bottomRightCompass)
        console.log(cfg.MapView?.map)

        cfg.MapView?.map.addControl(bottomRightCompass)

    }, [])

    return null

}