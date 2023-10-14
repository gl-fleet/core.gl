import { React } from 'uweb'
const { useEffect, useState, useRef } = React

export const mapHook = ({ containerId, isDarkMode, conf }: {
    containerId: string,
    isDarkMode: boolean,
    conf: any,
}): [boolean, number] => {

    const [isReady, setReady] = useState(false)

    useEffect(() => {

    }, [])

    useEffect(() => {


    }, [isDarkMode])

    return [isReady, 0]

}