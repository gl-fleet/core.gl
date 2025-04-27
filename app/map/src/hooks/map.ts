import { React } from 'uweb'
import { MapView } from 'uweb/maptalks'
const { useEffect, useState, useRef } = React

export const CanvasFixer = () => {

    const cv: any = document.querySelector('.maptalks-canvas-layer > canvas')
    // Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true warnings
    // const ct: any = cv.getContext('2d')  // Gives warning
    // const ct: any = cv.getContext('2d', { willReadFrequently: true }) // Same here
    const ct: any = cv.getContext('2d')

    if (ct) {

        setInterval(() => {

            try {

                const p = ct.getImageData(0, 0, 1, 1).data

                if (p[0] === 255 || p[0] === 0) {
                    console.log('[Blank_Fixer]', p)
                }

            } catch (err) {
                console.log('[Blank_Fixer]', err)
            }

        }, 15 * 1000)

    }

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

        const types = {
            'free': 'http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
            'topo': 'https://api.maptiler.com/maps/topo-v2/{z}/{x}/{y}.png?key=fM6kwMjQVVdkhE21oKJh',
            'satellite': 'https://api.maptiler.com/maps/satellite/256/{z}/{x}/{y}.jpg?key=l4hWJmvvmISSL7tpiPUZ',
            'openstreet': 'https://api.maptiler.com/maps/openstreetmap/{z}/{x}/{y}.jpg?key=l4hWJmvvmISSL7tpiPUZ',
        }

        ref.current = new MapView({
            zoom: 16, lat: 43.67338010130343, lon: 105.52008346330428,
            minZoom: 14,
            devicePixelRatio: 1,
            containerId,
            isDarkMode,
            simulate: false,
            doubleClickZoom: lowReso,
            urlTemplate: types.free,
            fps: 60,
            ...conf,
        })

        ref.current.onReady(() => {

            setReady(true)
            // CanvasFixer()

        })

    }, [])

    useEffect(() => { ref.current.setMode && ref.current.setMode(isDarkMode) }, [isDarkMode])

    return [isReady, ref.current]

}