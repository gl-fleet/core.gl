import Jimp from "jimp"
import { Host } from 'unet'
import { decodeENV, Safe, Now, log } from 'utils'

const { name, version, mode, ports } = decodeENV()

log.success(`"${name}" <${version}> module is running on "${process.pid}" / [${mode}] 🚀🚀🚀\n`)

const w = 640
const h = 480

const fatigue = {
    "actionTime": 1701410060,
    "resolvedMethodId": 0,
    "alarmTypeDescription": "Face-missing",
    "afterDriverName": "Unknown Driver",
    "latitude": 43.6662,
    "speed": 21,
    "plateColor": 0,
    "alarmDescription": null,
    "inclusion": true,
    "alarmValue": null,
    "isSupportLinkage": false,
    "subAlarmList": null,
    "alarmId": 151954129,
    "alarmSource": 1,
    "angle": 182.96,
    "processKey": "alarm|5300003001061079|82109304787598|5423816",
    "resolvedMethodName": null,
    "isFakeAlarm": null,
    "isResolved": null,
    "longitude": 105.492,
    "createDate": "2023-12-01 13:54:24",
    "direction": "West to South2Degree",
    "isSTDSU": false,
    "alarmSeverityName": "null",
    "alarmDataType": 1,
    "industrytype": "No entry",
    "address": "",
    "plateNo": "TONLY - HDU252",
    "VehicleId": 13394,
    "afterDriverId": -1,
    "depName": "DataAidLLC",
    "prevDriverId": null,
    "phoneNumber": null,
    "isDriverAuth": 0,
    "alarmTypeId": 4,
    "resolvedComments": "",
    "processingStatusDes": "null",
    "alarmLevelId": 6,
    "driverName": "Unknown Driver",
    "depId": 982,
    "prevDriverName": "Unknown Driver",
    "mediaPath": "http://rdf-media-prod-i18n.oss-us-west-1.aliyuncs.com/2023-12-01/5300003001061079/ALARM_4_135420.jpg?Expires=1701496713&OSSAccessKeyId=LTAI2LIlZPgzpcy9&Signature=CMVReARWYxHrA334t4xcRitvVl8%3D",
    "simNo": "5300003001061079"
}

Safe(() => {

    const API = new Host({ name, port: Number(ports[0]) })

    let memory: any = {
        query: null,
        body: null,
        last: null,
    }

    API.on('select', () => memory)

    API.on('insert', ({ query, body }) => {

        memory.query = query
        memory.body = body
        memory.last = Now()

        return 'done'

    })

    API.on('get', async () => {

        const time = Date.now()

        const req = await fetch('http://139.59.115.158/core_fatigue/select')

        const { body }: any = await req.json()

        const works = await Promise.all(body.map(async (e: any) => {

            const image = await Jimp.read(e.mediaPath)
            const crop = await image.resize(w / 8, h / 8).quality(75).getBase64Async(Jimp.MIME_JPEG)

            return {
                src: crop,
                orig: e.mediaPath,
                id: e.plateNo,
                desc: e.alarmTypeDescription,
                date: e.createDate,
            }

        }))

        console.log(works)

        return works

        /* const image = await Jimp.read(fatigue.mediaPath)
        const crop = await image.resize(w / 8, h / 8).quality(75).getBase64Async(Jimp.MIME_JPEG)

        return `<div>
            <img src="${crop}" /> <br/>
            <p>${fatigue.plateNo}</p>
            <p>${fatigue.alarmTypeDescription}</p>
            <p>${fatigue.createDate}</p>
            <p>${Date.now() - time}ms</p>
        </div>` */

    })

})