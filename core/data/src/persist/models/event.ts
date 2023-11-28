import { Host, Connection, ReplicaMaster, ReplicaSlave } from 'unet'
import { decodeENV, Uid, Now, Sfy, Loop, Safe, moment, dateFormat, log, Delay } from 'utils'
import { DataTypes, Model, ModelStatic } from 'sequelize'
import { Sequelize, Op } from 'sequelize'

import { Responsive } from '../helper'

const { me } = decodeENV()

export class Event {

    public local: Host
    public sequelize: Sequelize

    public name = 'events'
    public collection: ModelStatic<Model<any, any>> & any
    public data: any = {}

    constructor({ local, sequelize }: { local: Host, sequelize: Sequelize }) {

        this.local = local
        this.sequelize = sequelize

        this.table_build()
        this.table_serve()

    }

    table_build = () => {

        this.collection = this.sequelize.define(this.name, {

            id: { primaryKey: true, type: DataTypes.STRING, defaultValue: () => Uid() },
            proj: { type: DataTypes.STRING, defaultValue: '' },
            type: { type: DataTypes.STRING, defaultValue: '' },
            name: { type: DataTypes.STRING, defaultValue: '' },
            data: { type: DataTypes.TEXT, defaultValue: '' },
            src: { type: DataTypes.STRING, defaultValue: me },
            dst: { type: DataTypes.STRING, defaultValue: '' },
            createdAt: { type: DataTypes.STRING, defaultValue: () => Now() },
            updatedAt: { type: DataTypes.STRING, defaultValue: () => Now() },
            deletedAt: { type: DataTypes.STRING, defaultValue: null },

        }, { indexes: [{ unique: false, fields: ['type', 'src', 'dst', 'updatedAt'] }] })

        new ReplicaMaster({
            me: me,
            name: this.name,
            table: this.collection,
            channel: this.local,
            limit: 25,
            debug: false,
            authorize: true,
            onBeforeSave: (item, auth) => ({
                proj: auth.proj,
                ...item,
            })
        })

    }

    table_serve = () => {

        this.local.on(`get-${this.name}`, async (req: any) => await this.get(req.query))
        this.local.on(`set-${this.name}`, async (req: any) => await this.set(req.body))
        this.local.on(`del-${this.name}`, async (req: any) => await this.del(req.body))

        this.local.on(`get-${this.name}-latest`, async (req) => this.auth(req) && await this.get_latest())

        const sub = [10 /** Days **/, 13 /** Hours **/, 16 /** Minutes **/]
        this.local.on('test', async () => this.collection.findAll({
            attributes: [
                'data',
                'updatedAt',
                [Sequelize.literal(`SUBSTRING(updatedAt, 1, ${sub[1]})`), 'updatedIn']
            ],
            where: { src: 'SV101', deletedAt: null },
            order: [['updatedAt', 'ASC']],
            group: ['updatedIn'],
            limit: 12,
        }))

    }

    /*** *** *** @___Table_Queries___ *** *** ***/

    auth = ({ headers }: any) => {

        const { verified } = headers
        if (typeof verified === 'string' && verified === 'yes') return true
        throw new Error('Not Authorized!')

    }

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

        const { options } = args
        delete args['options']

        if (args.id) { /** gonna update **/

            const [updatedRows] = await this.collection.update({ ...args, updatedAt: Now() }, {
                where: { id: args.id, src: me }, ...options, individualHooks: true
            })

            if (updatedRows > 0) return `${updatedRows} ${updatedRows > 1 ? 'rows' : 'row'} updated!`
            else throw new Error(`Permission denied!`)

        } else {

            const [instance] = await this.collection.upsert({ ...args, data: Sfy(args.data) }, { ...options })
            return `${instance.id} is created!`

        }

    }

    del = async ({ id }: { id: string }) => {

        const [updatedRows] = await this.collection.update({ updatedAt: Now(), deletedAt: Now() }, { where: { id: id, src: me }, individualHooks: true })
        if (updatedRows > 0) return `${updatedRows} ${updatedRows > 1 ? 'rows' : 'row'} deleted!`
        else throw new Error(`Permission denied!`)

    }

    event = async (cb: any, delay: number = 250) => {

        const { shake, call } = new Responsive()
        this.collection.afterCreate(() => { shake() })
        this.collection.afterUpdate(() => { shake() })
        this.collection.afterUpsert(() => { shake() })
        call(cb, delay)

    }

    get_latest = async () => await this.collection.findAll({

        attributes: ['type', 'name', 'src', 'data', [Sequelize.fn('MAX', Sequelize.col('updatedAt')), 'updatedAt']],
        where: {
            updatedAt: { [Op.gte]: moment().add(-7, 'days').format(dateFormat) },
            deletedAt: null,
        },
        group: ["src"],

    })

}