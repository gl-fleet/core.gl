import { React, Space, Progress, Spin } from 'uweb'
import { ColorR2G, ColorG2R } from 'uweb/utils'
import { oget } from 'utils/web'
import { createGlobalStyle } from 'styled-components'

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

    const gsm = oget('-')(data, 'gsm', 'state')
    const gsm_value = oget(0)(data, 'gsm', 'perc')
    const gsm_perc = Number(((gsm_value * 100) / 100).toFixed(1))
    const gsm_color = ColorR2G(gsm_perc, [20, 40, 60, 80, 100])

    const gps_value = oget(99)(data, 'accuracy', '_3d')
    const gps_perc = Number((((12.5 - gps_value) * 100) / 12.5).toFixed(1))
    const gps_color = ColorG2R(gps_value, [2.5, 5, 7.5, 10, 12.5])

    const gps1 = oget('')(data, 'g1', 'isrtk')
    const gps1_value = oget(0)(data, 'g1', 'sats')
    const gps1_perc = Number(((gps1_value * 100) / 30).toFixed(1))
    const gps1_color = ColorR2G(gps1_value, [18, 21, 24, 27, 30])

    const gps2 = oget('')(data, 'g2', 'isrtk')
    const gps2_value = oget(0)(data, 'g2', 'sats')
    const gps2_perc = Number(((gps2_value * 100) / 30).toFixed(1))
    const gps2_color = ColorR2G(gps2_value, [18, 21, 24, 27, 30])

    const rtcm = oget('')(data, 'rtcm')
    const rtcm_perc = rtcm === 'success' ? 100 : 0
    const rtcm_color = ColorR2G(rtcm_perc, [20, 40, 60, 80, 100])

    const size = 20
    const width = 24

    return <div style={{ position: 'absolute', bottom: 16, left: 24, zIndex: 100, margin: 0 }}>

        <Spin spinning={loading}>

            <Space wrap style={{ border: '1px dashed #1668dc', padding: '6px 16px', borderRadius: 8 }}>
                <Progress type="dashboard" percent={gsm_perc} strokeColor={gsm_color} size={size} strokeWidth={width} format={() => `Network: ${gsm} / ${gsm_value}%`} />
                <Progress type="dashboard" percent={gps_perc} strokeColor={gps_color} size={size} strokeWidth={width} format={() => `Accuracy: ${gps_value}cm`} />
                <Progress type="dashboard" percent={gps1_perc} strokeColor={gps1_color} size={size} strokeWidth={width} format={() => `GPS1: ${gps1} / ${gps1_value}(sats)`} />
                <Progress type="dashboard" percent={gps2_perc} strokeColor={gps2_color} size={size} strokeWidth={width} format={() => `GPS2: ${gps2} / ${gps2_value}(sats)`} />
                <Progress type="dashboard" percent={rtcm_perc} strokeColor={rtcm_color} size={size} strokeWidth={width} format={() => `RTCM: ${rtcm}`} />
            </Space>

        </Spin>

    </div>

}