import { Host, Connection, ReplicaMaster, ReplicaSlave } from 'unet'
import { decodeENV, Uid, Now, Sfy, Jfy } from 'utils'
import { DataTypes, Model, ModelStatic } from 'sequelize'
import { Sequelize } from 'sequelize'
import { Responsive } from '../helper'

const { me } = decodeENV()

export class Rover {

    public local: Host
    public sequelize: Sequelize

    public name = 'rovers'
    public collection: ModelStatic<Model<any, any>> & any

    constructor({ local, sequelize }: { local: Host, sequelize: Sequelize }) {

        this.local = local
        this.sequelize = sequelize

        this.table_build()
        this.table_serve()
        this.notify()

    }

    /*** *** *** @___Table_Setup___ *** *** ***/

    table_build = () => {

        this.collection = this.sequelize.define(this.name, {

            id: { primaryKey: true, type: DataTypes.STRING, defaultValue: () => Uid() },
            project: { type: DataTypes.STRING, defaultValue: '' },
            type: { type: DataTypes.STRING, defaultValue: '' },
            name: { type: DataTypes.STRING, defaultValue: '', unique: true },
            meta: { type: DataTypes.TEXT, defaultValue: '' },
            event: { type: DataTypes.TEXT, defaultValue: '' },
            createdAt: { type: DataTypes.STRING, defaultValue: () => Now() },
            updatedAt: { type: DataTypes.STRING, defaultValue: () => Now() },
            deletedAt: { type: DataTypes.STRING, defaultValue: null },

        }, { indexes: [{ unique: false, fields: ['project', 'type', 'updatedAt'] }] })

    }

    table_serve = () => {

        this.local.on(`get-${this.name}`, async ({ headers, query }) => {

            const { verified } = headers
            console.log(headers)
            return await this.get(query)

        })

        this.local.on(`set-${this.name}`, async (req: any) => await this.set(req.body))
        this.local.on(`del-${this.name}`, async (req: any) => await this.del(req.body))

    }

    /*** *** *** @___Table_Queries___ *** *** ***/

    get = async (args: any) => {
        return await this.collection.findAll({
            where: { ...args, deletedAt: null },
            order: [['updatedAt', 'ASC']],
        })
    }

    set = async (args: any) => {
        const { options } = args
        delete args['options']
        const [instance] = await this.collection.upsert({ ...args }, { ...options })
        return `${instance.id} is set!`
    }

    del = async (args: any) => {
        const { name } = args
        const [updatedRows] = await this.collection.update(
            { updatedAt: Now(), deletedAt: Now() },
            { where: { name }, individualHooks: true }
        )
        return `${updatedRows} ${updatedRows > 1 ? 'rows' : 'row'} deleted!`
    }

    notify = () => {

        const tell: any = () => this.local.emit(`get-${this.name}`, true)
        const { shake, call } = new Responsive()
        this.collection.afterCreate(() => { shake() })
        this.collection.afterUpdate(() => { shake() })
        this.collection.afterUpsert(() => { shake() })
        call(tell, 250)

    }

    /*** *** *** @___Table_Complex___ *** *** ***/

    get_abcde = async (query: any) => {
        const rows = await this.collection.findAll({ where: { ...query, deletedAt: null }, order: [['offset', 'ASC']] })
        return rows
    }

}