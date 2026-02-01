import { React, Tabs, Alert } from 'uweb'
import ReactJson from 'react-json-view'
const { useEffect, useState } = React

import { Connection } from 'unet/web'
import { KeyValue } from 'utils/web'

const onChange = (key: string) => {
    console.log(key)
}

export default ({ event, isDarkMode }: iArgs) => {

    const [UHG, setUHG] = useState({})
    const [BN, setBN] = useState({})

    const [devices, setDevices] = useState({})

    useEffect(() => {

        const core_rtcm = new Connection({ name: 'core_rtcm', token: KeyValue('token') })
        const core_third = new Connection({ name: 'core_third', token: KeyValue('token'), timeout: 15000 })

        core_rtcm.poll('UHG', null, (err, res) => {

            console.log('UHG', err, res)
            err ? setUHG(err) : setUHG(res)

        })

        core_rtcm.poll('BN', null, (err, res) => {

            console.log('BN', err, res)
            err ? setBN(err) : setBN(res)

        })

        core_third.poll('devices', null, (err, res) => {

            console.log('Devices', err, res)
            err ? setDevices(err) : setDevices(res)

        })

        return () => {

            core_rtcm.exit()
            core_third.exit()

        }

    }, [])

    const items = [
        {
            key: '1',
            label: 'Base Station',
            children: <div>
                <ReactJson
                    name="UHG-BaseStation"
                    src={UHG}
                    theme={isDarkMode ? "twilight" : "bright:inverted"}
                    style={{ background: 'transparent' }}
                />
                <ReactJson
                    name="BN-BaseStation"
                    src={BN}
                    theme={isDarkMode ? "twilight" : "bright:inverted"}
                    style={{ background: 'transparent' }}
                />
            </div>
            // children: <Alert message="Permission denied!" type="warning" showIcon closable />,
        },
        {
            key: '2',
            label: 'Devices',
            children: <ReactJson
                name="Devices"
                src={devices}
                theme={isDarkMode ? "twilight" : "bright:inverted"}
                style={{ background: 'transparent' }}
            />
            // children: <Alert message="Permission denied!" type="warning" showIcon closable />,
        },
        {
            key: '3',
            label: 'Execute',
            children: <Alert message="Permission denied!" type="warning" showIcon closable />,
        },
    ]

    return <Tabs style={{ overflow: 'hidden' }} defaultActiveKey="1" items={items} onChange={onChange} />

}