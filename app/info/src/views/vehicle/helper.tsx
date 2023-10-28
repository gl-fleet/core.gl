import { React, Button } from 'uweb'
import { Vehicle, Toyota, Drill, Dozer } from 'uweb/utils'
import { MapView } from 'uweb/maptalks'
import { Loop, log, moment, oget } from 'utils/web'

import { createGlobalStyle } from 'styled-components'
import { CloudSyncOutlined } from '@ant-design/icons'

const { useEffect, useState, useRef } = React

export const Style = createGlobalStyle`
    .maptalks-attribution {
        display: none;
    }
    #root > div {
        height: fit-content !important;
        min-height: 100% !important;
    }
    #root .ant-float-btn-group {
        display: none;
    }
    .react-json-view {
        border-radius: 4px;
        padding: 8px;
        margin-bottom: 16px;
    }
`

export const getVehicle = (Maptalks: MapView, type: string): Promise<Vehicle> => new Promise((resolve, reject) => {

    log.info(`[Vehicles] -> Get Vehicle / ${type}`)

    type === 'vehicle' && Toyota({ size: 50, x: 0, y: 0, z: 0 })
        .then((Truck) => resolve(new Vehicle({ Truck, Maptalks })))
        .catch((err) => reject(err))

    type === 'drill' && Drill({ size: 50, x: 0, y: 0, z: 0 })
        .then((Truck) => resolve(new Vehicle({ Truck, Maptalks })))
        .catch((err) => reject(err))

    type === 'dozer' && Dozer({ size: 50, x: 0, y: 0, z: 0 })
        .then((Truck) => resolve(new Vehicle({ Truck, Maptalks })))
        .catch((err) => reject(err))

})

export const UpdateStatus = ({ data }: any) => {

    const [danger, setDanger] = useState(false)
    const last = useRef(0)
    last.current = oget(0)(data, 'last')

    useEffect(() => {

        Loop(() => {

            const delay = Date.now() - last.current
            setDanger(delay > 5000 ? true : false)

        }, 1000)

    }, [])

    if (last.current === 0) return <Button danger={danger} disabled={true} type='dashed' icon={<CloudSyncOutlined />}>
        {'...'}
    </Button>
    else return <Button danger={danger} ghost disabled={false} type='primary' icon={<CloudSyncOutlined />}>
        {moment(last.current).format('HH:mm:ss.SSS')}
    </Button>

}