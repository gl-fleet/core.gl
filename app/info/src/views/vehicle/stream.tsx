import { React, Layout, Row, Col, Space, Progress, Typography, Button, Tag, Spin } from 'uweb'
import { ColorR2G, ColorG2R } from 'uweb/utils'
import { oget } from 'utils/web'
import { createGlobalStyle } from 'styled-components'

const { useEffect, useState, useRef } = React

export const Style = createGlobalStyle`
    .maptalks-attribution {
        display: none;
    }
    #root > div {
        height: fit-content !important;
        min-height: 100% !important;
    }
    #root .ant-float-btn-group {
        display: none;
    }
    .react-json-view {
        border-radius: 4px;
        padding: 8px;
        margin-bottom: 16px;
    }
`

export default ({ loading, err, data }: any) => {

    const gsm_value = oget(0)(data, 'data_gsm', 'quality')
    const gsm_perc = Number(((gsm_value * 100) / 100).toFixed(1))
    const gsm_color = ColorR2G(gsm_perc, [20, 40, 60, 80, 100])

    const gps_value = oget(99)(data, 'data_gps', 'prec3d')
    const gps_perc = Number((((12.5 - gps_value) * 100) / 12.5).toFixed(1))
    const gps_color = ColorG2R(gps_value, [2.5, 5, 7.5, 10, 12.5])

    const gps1_value = oget([0, 0, 0])(data, 'data_gps1')[2]
    const gps1_perc = Number(((gps1_value * 100) / 10).toFixed(1))
    const gps1_color = ColorG2R(gps1_value, [18, 21, 24, 27, 30])

    const gps2_value = oget([0, 0, 0])(data, 'data_gps2')[2]
    const gps2_perc = Number(((gps2_value * 100) / 30).toFixed(1))
    const gps2_color = ColorR2G(gps2_value, [18, 21, 24, 27, 30])

    const rtcm_value = oget('-')(data, 'data_rtcm', 'state')
    const rtcm_perc = rtcm_value === 'success' ? 100 : 0
    const rtcm_color = ColorR2G(rtcm_perc, [20, 40, 60, 80, 100])

    return <div style={{ position: 'absolute', width: 120, bottom: 16, left: 38, zIndex: 100, margin: 0 }}>

        <Spin spinning={loading}>

            <Progress percent={gsm_perc} strokeColor={gsm_color} trailColor='#e5e5e5' size="small"
                format={(percent) => `Network ${percent}%`} />

            <Progress percent={gps_perc} strokeColor={gps_color} trailColor='#e5e5e5' size="small"
                format={(percent) => `GPS-1 ${gps_value} CM`} />

            <Progress percent={gps1_perc} strokeColor={gps1_color} trailColor='#e5e5e5' size="small"
                format={(percent) => `GPS-1 ${percent}%`} />

            <Progress percent={gps2_perc} strokeColor={gps2_color} trailColor='#e5e5e5' size="small"
                format={(percent) => `GPS-2 ${percent}%`} />

            <Progress percent={rtcm_perc} strokeColor={rtcm_color} trailColor='#e5e5e5' size="small"
                format={(percent) => `RTCM ${percent}%`} />

        </Spin>

    </div>

}