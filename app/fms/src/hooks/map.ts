import { React } from 'uweb'
import { MapView } from 'uweb/maptalks'

const { useEffect, useState, useRef } = React

const types = {
    'light': 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    'dark': 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    'voyager': 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
}

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
            lat: 43.67338010130343, lon: 105.52008346330428,
            zoom: 18,
            minZoom: 8,
            devicePixelRatio: 1,
            containerId,
            simulate: false,
            doubleClickZoom: lowReso,
            fps: 60,
            ...conf,
        })

        ref.current.onReady(() => setReady(true))

    }, [])

    useEffect(() => {

        if (ref.current.map && ref.current.map.VERSION) {

            const layer = ref.current.map.getLayer('base')
            layer.config('urlTemplate', isDarkMode ? types.dark : types.light)
            layer.forceReload()

        }

    }, [isDarkMode, isReady])

    return [isReady, ref.current]

}