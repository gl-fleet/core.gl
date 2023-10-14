import { React } from 'uweb'
import { MapView } from 'uweb/maptalks'
import { log, Delay, Safe } from 'utils/web'
const { useEffect, useState, useRef } = React

export const mapHook = ({ containerId, isDarkMode, conf }: {
    containerId: string,
    isDarkMode: boolean,
    conf: any,
}): [boolean, MapView] => {

    const [isReady, setReady] = useState(false)
    const ref: { current: MapView } = useRef(null)

    useEffect(() => {

        ref.current = new MapView({
            lat: 43.67338010130343, lon: 105.52008346330428, zoom: 15,
            containerId,
            isDarkMode,
            simulate: false,
            urlTemplate: `https://c.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png`,
            ...conf,
        })

        ref.current.onReady(() => setReady(true))

    }, [])

    useEffect(() => { ref.current.setMode && ref.current.setMode(isDarkMode) }, [isDarkMode])

    return [isReady, ref.current]

}