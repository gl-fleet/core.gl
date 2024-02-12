import { React, Layout, Row, Col, Space, Upload, Select, Typography, Input, Button, Divider, message } from 'uweb'
import { InboxOutlined } from '@ant-design/icons'
import { createGlobalStyle } from 'styled-components'
import { log, Delay, Safe, KeyValue } from 'utils/web'
import ReactJson from 'react-json-view'
import { parseJwt } from './vehicle/helper'

const { useEffect, useState, useRef } = React
const { Title, Text } = Typography
const { Dragger } = Upload

const Style = createGlobalStyle`
    #root > div {
        height: fit-content !important;
        min-height: 100% !important;
    }
    #root .ant-float-btn-group {
        display: none;
    }
    .ant-upload-drag {
        height: 140px !important;
    }
    .react-json-view {
        border-radius: 4px;
        padding: 8px;
        margin-bottom: 16px;
    }
`

export default (cfg: iArgs) => {

    const name = ((new URL(document.location.toString())).searchParams).get('type')
    log.info(`[FILE] -> Query / ${name}`)

    const [loading, setLoading] = useState(false)
    const [json, setJson] = useState({})
    const fileRef: any = useRef()
    const equipRef: any = useRef()

    const props = {
        name: 'file',
        multiple: false,
        action: `${window.location.origin}/core_data/${name}`,
        onChange: (info: any) => {

            const { status } = info.file

            if (status !== 'uploading') {
                console.log(info.file, info.fileList)
            }
            if (status === 'done') {
                console.log('Response', info.file.response)
                const stringify = JSON.stringify(info.file.response)
                setJson(info.file.response)
                message.success(`${info.file.name} file uploaded successfully.`)
            }
            if (status === 'error') {
                message.error(`${info.file.name} file upload failed.`)
            }

        },
        onDrop: (e: any) => {
            console.log('Dropped files', e.dataTransfer.files)
        },
    }

    const save = () => {

        try {

            log.info(`File name: ${fileRef.current.input.value}`)
            log.info(`Equipment name: ${equipRef.current.input.value}`)
            log.info(`GeoJSON: ${json}`)

            const success = () => {
                fileRef.current.input.value = ""
                equipRef.current.input.value = ""
                setJson({})
                message.success('Success!')
            }

            const payload = {
                name: String(fileRef.current.input.value),
                dst: String(equipRef.current.input.value),
                type: String(name),
                data: json,
            }

            if (payload.name.length <= 2) {
                message.warning(`Please enter file name!`)
                return
            }

            if (payload.dst.length <= 2) {
                message.warning(`Please enter equipment name!`)
                return
            }

            if (Object.keys(payload.data).length === 0) {
                message.warning(`No file detected!`)
                return
            }

            setLoading(true)
            cfg.api.set('set-chunks', payload)
                .then(e => success())
                .catch(e => { message.error('Please try again!') })
                .finally(() => setLoading(false))

        } catch (err: any) { message.error(`${err.message}`) }

    }

    return <Layout style={{ padding: 16 }}>
        <Row gutter={[16, 16]} id="main">

            <Style />

            <Col span={24}>
                <Title><InboxOutlined /> File Manager [{name}]</Title>
            </Col>

            <Col span={24}>
                <Dragger {...props}>
                    <Space direction="vertical">
                        <Title className="ant-upload-drag-icon" style={{ margin: 0 }}><InboxOutlined /></Title>
                        <Text className="ant-upload-text">Click or drag file to this area to upload</Text>
                        <Text className="ant-upload-hint">Support for a single or bulk upload. Strictly prohibited from uploading company data or other banned files.</Text>
                    </Space>
                </Dragger>
            </Col>

            <Divider />

            <Col span={24}>
                <ReactJson src={json} theme="monokai" />
            </Col>

            <Col span={12}>
                <Input ref={fileRef} placeholder="File name" />
            </Col>

            <Col span={12}>
                <Space.Compact style={{ width: '100%' }}>
                    <Input ref={equipRef} placeholder="Equipment name" />
                    <Button loading={loading} type="primary" onClick={() => save()}>Save</Button>
                </Space.Compact>
            </Col>

        </Row>
    </Layout>

}