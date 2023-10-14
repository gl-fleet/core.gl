import { React, Layout, Modal, Typography, Button, message } from 'uweb'
import { createGlobalStyle } from 'styled-components'
import { Connection } from 'unet/web'
import ReactJson from 'react-json-view'

const { Text, Link } = Typography
const { useEffect, useState, useRef } = React

const Style = createGlobalStyle`
    .react-json-view {
        border-radius: 4px;
        padding: 8px;
        margin-bottom: 16px;
    }
`

export default (cfg: iArgs) => {

    const [open, setOpen] = useState(false)
    const [infoUH, setInfoUH] = useState({})
    const [infoBN, setInfoBN] = useState({})

    const [isStart, setStart] = useState(false)
    const [isStop, setStop] = useState(false)

    useEffect(() => {

        const rtcm = new Connection({ name: 'core_rtcm' })
        rtcm.poll('uh', {}, (err: any, data: any) => !err && setInfoUH(data))
        rtcm.poll('bn', {}, (err: any, data: any) => !err && setInfoBN(data))

        return () => { }

    }, [])

    const start = () => {
        setStart(true)
        cfg.io.proxy.emit('start', { name: 'rtcm' }, (err: any, data: any) => {
            setStart(false)
            if (err) message.error(err.message)
            else message.success(`Success!`)
        })
    }

    const stop = () => {
        setStop(true)
        cfg.io.proxy.emit('stop', { name: 'rtcm' }, (err: any, data: any) => {
            setStop(false)
            if (err) message.error(err.message)
            else message.success(`Success!`)
        })
    }

    return <>
        <Style />
        <Text onClick={() => setOpen(true)}>RTCM</Text>
        <Modal
            title="RTCM Status"
            centered
            open={open}
            onCancel={() => setOpen(false)}
            footer={[
                <Button key="stop" loading={isStop} onClick={() => stop()} type="primary" danger ghost>Stop</Button>,
                <Button key="start" loading={isStart} onClick={() => start()}>Start</Button>,
            ]}
        >
            <ReactJson src={infoUH} theme="monokai" />
            <ReactJson src={infoBN} theme="monokai" />
        </Modal>
    </>

}