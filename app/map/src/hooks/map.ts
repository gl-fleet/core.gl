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
            containerId,
            lat: 43.67338010130343,
            lon: 105.52008346330428,
            zoom: 15,
            isDarkMode,
            simulate: false,
            ...conf,
        })

        ref.current.onReady(() => {
            setReady(true)
        })

    }, [])

    useEffect(() => {

        ref.current.setMode && ref.current.setMode(isDarkMode)

    }, [isDarkMode])

    return [isReady, ref.current]

}