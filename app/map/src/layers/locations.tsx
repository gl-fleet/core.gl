import { React, Typography } from 'uweb'
import { MapView, maptalks } from 'uweb/maptalks'
import { CloseCircleOutlined } from '@ant-design/icons'
import { Safe, Delay } from 'utils/web'
import { THREE } from 'uweb/three'
import { useEffect, useRef, useState } from 'react'

export const LocationsLayer = (cfg: iArgs) => {

    const [on, setOn] = useState(false)
    const folder: any = useRef(null)

    useEffect(() => { cfg.event.on('layer.locations', () => setOn((v) => !v)) }, [])

    useEffect(() => {

        if (cfg.Pane) {

            if (on === false) folder.current && folder.current.dispose()
            else {

                const PARAMS = {
                    background: { key: 'bg', r: 255, g: 0, b: 55 },
                    tint: { key: 'tnt', r: 0, g: 255, b: 214, a: 0.5 },
                }

                folder.current = cfg.Pane.addFolder({
                    title: 'Locations'
                })

                folder.current.addBinding(PARAMS, 'background')
                folder.current.addBinding(PARAMS, 'tint')

                folder.current.on('change', (ev: any) => {
                    console.log(ev)
                })

            }

        }

    }, [on])

    return null
}