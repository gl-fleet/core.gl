import { Host } from 'unet'
import { decodeENV, Uid, Now, Jfy } from 'utils'
import { DataTypes, Model, ModelStatic } from 'sequelize'
import { Sequelize } from 'sequelize'
import ogr2ogr from 'ogr2ogr'
import fs from 'fs'

import { chunks, Responsive, Save } from './utils'

const { me } = decodeENV()

export class Chunk {

    public local: Host
    public sequelize: Sequelize

    public name = 'chunks'
    public collection: ModelStatic<Model<any, any>> & any
    public data: any = {}

    constructor({ local, sequelize }: { local: Host, sequelize: Sequelize }) {

        this.local = local
        this.sequelize = sequelize

        this.table_build()
        this.table_serve()

    }

    /*** *** *** @___Table_Setup___ *** *** ***/

    table_build = () => {

        this.collection = this.sequelize.define(this.name, {

            id: { primaryKey: true, type: DataTypes.STRING, defaultValue: () => Uid() },
            type: { type: DataTypes.STRING, defaultValue: '' },
            name: { type: DataTypes.STRING, defaultValue: '' },
            offset: { type: DataTypes.INTEGER, defaultValue: 0 },
            data: { type: DataTypes.TEXT, defaultValue: '' },
            src: { type: DataTypes.STRING, defaultValue: me },
            dst: { type: DataTypes.STRING, defaultValue: '' },
            createdAt: { type: DataTypes.STRING, defaultValue: () => Now() },
            updatedAt: { type: DataTypes.STRING, defaultValue: () => Now() },
            deletedAt: { type: DataTypes.STRING, defaultValue: null },

        }, { indexes: [{ unique: false, fields: ['type', 'src', 'dst', 'updatedAt'] }] })

    }

    table_serve = () => {

        this.local.on(`get-${this.name}`, async (req: any) => await this.get(req.query))
        this.local.on(`set-${this.name}`, async (req: any) => await this.set(req.body))
        this.local.on(`del-${this.name}`, async (req: any) => await this.del(req.body))

        this.local.on(`get-${this.name}-merged`, async ({ query }: any) => await this.get_merged(query))
        this.local.on(`get-${this.name}-distinct`, async ({ query }) => await this.get_distinct(query))

        this.local.on("dxf-geojson", this.upload_dxf)
        this.local.on("csv-geojson", this.upload_csv)
        this.local.on("json-upload", this.upload_json)

    }

    /*** *** *** @___Table_Queries___ *** *** ***/

    get = async (args: any) => {
        const { options } = args
        delete args['options']
        return await this.collection.findAll({
            where: { ...args, deletedAt: null },
            order: [['updatedAt', 'ASC']],
            ...options
        })
    }

    set = async (args: any) => {
        const { name, type, dst, data } = args
        await this.collection.update({ updatedAt: Now(), deletedAt: Now() }, { where: { name, type, dst }, individualHooks: true })
        chunks.Split(data).forEach(async (data, offset) => await this.collection.create({ name, type, dst, offset, data }))
        return "Success!"
    }

    del = async (args: any) => {
        const { name, type, dst } = args
        const [updatedRows] = await this.collection.update({ updatedAt: Now(), deletedAt: Now() }, { where: { name, type, dst }, individualHooks: true })
        if (updatedRows > 0) return `${updatedRows} ${updatedRows > 1 ? 'rows' : 'row'} deleted!`
        else throw new Error(`Permission denied!`)
    }

    event = async (cb: any, delay: number = 250) => {
        const { shake, call } = new Responsive()
        call(cb, delay)
        this.collection.afterCreate(() => { shake() })
        this.collection.afterUpdate(() => { shake() })
        this.collection.afterUpsert(() => { shake() })
    }

    /*** *** *** @___Table_Complex___ *** *** ***/

    upload_dxf = async (req: any, res: any) => {
        const { file }: any = await Save(req, res)
        const { data } = await ogr2ogr(`./${file.path}`)
        return data
    }

    upload_csv = async (req: any, res: any) => {
        const { file }: any = await Save(req, res)
        const { data } = await ogr2ogr(`./${file.path}`)
        return data
    }

    upload_json = async (req: any, res: any) => {
        const { file }: any = await Save(req, res)
        return Jfy(fs.readFileSync(`./${file.path}`))
    }

    get_distinct = async (query: any) => {
        return await this.collection.findAll({
            attributes: ['name', 'type', 'src', 'dst',
                [Sequelize.fn('COUNT', Sequelize.col('offset')), 'count'],
                [Sequelize.fn('MAX', Sequelize.col('createdAt')), 'createdAt'],
                [Sequelize.fn('MAX', Sequelize.col('updatedAt')), 'updatedAt'],
            ],
            where: { ...query, deletedAt: null }, order: [['updatedAt', 'DESC']],
            group: ['name', 'type', 'src', 'dst'],
        })
    }

    get_merged = async (query: any) => {
        const rows = await this.collection.findAll({ where: { ...query, deletedAt: null }, order: [['offset', 'ASC']] })
        return chunks.Merge(rows)
    }

}