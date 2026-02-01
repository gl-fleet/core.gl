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
            'light': 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
            'dark': 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
            'voyager': 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        }

        ref.current = new MapView({
            lat: 43.67338010130343, lon: 105.52008346330428,
            zoom: 18,
            minZoom: 8,
            devicePixelRatio: 1,
            containerId,
            isDarkMode,
            simulate: false,
            doubleClickZoom: lowReso,
            urlTemplate: types.light,
            fps: 60,
            ...conf,
        })

        ref.current.onReady(() => setReady(true))

    }, [])

    useEffect(() => { ref.current.setMode && ref.current.setMode(isDarkMode) }, [isDarkMode])

    return [isReady, ref.current]

}