import { Host, Connection, ReplicaMaster } from 'unet'
import { Sequelize, DataTypes } from 'sequelize'
import { Now, Sfy, Jfy, log } from 'utils'

import ogr2ogr from 'ogr2ogr'
import fs from 'fs'

import { SequelTable } from './utils/sequel'
import { Chunk } from './utils/merger'
import { Save } from './utils/multer'

export const initChunks = (

    io: Host,
    sequelize: Sequelize,
    me: string,
    debug: string,

) => {

    /** Building a table */
    const Chunks = SequelTable('chunks', sequelize, me, {
        meta: { type: DataTypes.TEXT, defaultValue: '' },
        offset: { type: DataTypes.INTEGER, defaultValue: 0 },
        data: { type: DataTypes.TEXT, defaultValue: '' },
    })

    Chunks.uchange(() => io.emit('get-chunks', true), 1000)
    io.on("get-chunks", async ({ query }: any) => await Chunks.uget(query))
    io.on("del-chunks", async ({ body }: any) => await Chunks.udel(body))
    io.on("set-chunks", async ({ body: { name, type, dst, data } }: any) => {

        await Chunks.update({ updatedAt: Now(), deletedAt: Now() }, { where: { name, type, dst }, individualHooks: true }) /** Remove existing chunks **/
        Chunk.Split(data).forEach(async (data, offset) => await Chunks.create({ name, type, dst, offset, data }))
        return "Success!"

    })

    io.on("dxf-geojson", async (req: any, res: any) => {

        const { file }: any = await Save(req, res)
        const { data } = await ogr2ogr(`./${file.path}`)
        return data

    })

    io.on("csv-geojson", async (req: any, res: any) => {

        const { file }: any = await Save(req, res)
        const { data } = await ogr2ogr(`./${file.path}`)
        return data

    })

    io.on("json-upload", async (req: any, res: any) => {

        const { file }: any = await Save(req, res)
        return Jfy(fs.readFileSync(`./${file.path}`))

    })

    /** Starting replication */
    const RepChunks = new ReplicaMaster({
        me: me,
        name: 'chunks',
        channel: io,
        limit: 5,
        table: Chunks,
        debug: debug === 'true',
    })

    return { Chunks, RepChunks }

}
