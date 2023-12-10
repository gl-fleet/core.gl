import { React, Layout, Modal, Avatar, FloatButton, Badge, List } from 'uweb'
import { VideoCameraOutlined } from '@ant-design/icons'

import { Connection } from 'unet/web'
import { KeyValue } from 'utils/web'

const { useState, useRef, useEffect } = React

export default (cfg: iArgs) => {

    const [open, setOpen] = useState(false)
    const [status, setStatus] = useState<any>('processing')
    const [list, setList] = useState([])

    useEffect(() => {

        const api = new Connection({ name: 'core_fatigue', token: KeyValue('token') })
        api.status((name) => setStatus(name))
        api.poll('get', {}, (err: any, data: any) => !err && setList(data ?? []))

    }, [])

    useEffect(() => {

        if (open === false) return

    }, [open])

    return <>

        <Layout style={{ background: 'transparent', position: 'absolute', left: 16, top: 16, padding: 0, zIndex: 100 }}>
            <FloatButton.Group shape="circle" style={{ top: 80, zIndex: 10, height: 'fit-content' }}>
                <FloatButton tooltip={'Alarm fatigue'} badge={{ count: list.length, color: 'orange' }} type="default" onClick={() => setOpen(true)} icon={<VideoCameraOutlined />} />
            </FloatButton.Group>
        </Layout>

        <Modal title={<Badge status={status} text="Alarm fatigue" />} confirmLoading={false} centered open={open} onOk={() => { }} onCancel={() => setOpen(false)} destroyOnClose={true}>

            <List
                itemLayout="horizontal"
                dataSource={list}
                renderItem={(item: any, index) => (
                    <List.Item>
                        <List.Item.Meta
                            avatar={<Avatar shape="square" size={70} src={item.thumb} />}
                            title={<a target='_blank' href={item.vids[0] ?? '#'}>{item.id} / {item.desc} {item.vids.length > 0 ? <span style={{ color: 'blue' }}>[Video]</span> : ''}</a>}
                            description={<>
                                <span>The system triggered a </span>
                                <b>{item.desc}</b> alert as the <b>{item.id}</b> vehicle was speeding at <b>{item.speed}</b> km/h.
                            </>}
                        />
                    </List.Item>
                )}
            />

        </Modal>

    </>

}