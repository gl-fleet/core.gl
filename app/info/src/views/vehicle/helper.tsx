import { Vehicle, Toyota, Drill, Dozer } from 'uweb/utils'
import { MapView } from 'uweb/maptalks'
import { log } from 'utils/web'
import { createGlobalStyle } from 'styled-components'

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