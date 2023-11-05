import { React } from 'uweb'
import { MapView } from 'uweb/maptalks'
const { useEffect, useState, useRef } = React

export const mapHook = ({ containerId, isDarkMode, conf }: {
    containerId: string,
    isDarkMode: boolean,
    conf: any,
}): [boolean, MapView] => {

    const [isReady, setReady] = useState(false)
    const ref: any = useRef(null)

    useEffect(() => {

        const lowReso = document.documentElement.clientWidth < 1024

        ref.current = new MapView({
            zoom: 16, lat: 43.67338010130343, lon: 105.52008346330428,
            minZoom: 14,
            devicePixelRatio: lowReso ? 1 : 1,
            containerId,
            isDarkMode,
            simulate: false,
            doubleClickZoom: lowReso,
            urlTemplate: `https://c.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png`,
            fps: 40,
            ...conf,
        })

        ref.current.onReady(() => setReady(true))

    }, [])

    useEffect(() => { ref.current.setMode && ref.current.setMode(isDarkMode) }, [isDarkMode])

    return [isReady, ref.current]

}