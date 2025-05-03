import { DataTypes, Model, ModelStatic, Op } from 'sequelize'
import { Sequelize } from 'sequelize'
import { Uid, Now } from 'utils'
import { Host } from 'unet'

export class Enums {

    public name = 'enums'
    public local: Host
    public sequelize: Sequelize
    public collection: ModelStatic<Model<any, any>> & any
    public data: any = {}

    constructor({ local, sequelize }: { local: Host, sequelize: Sequelize }) {

        this.local = local
        this.sequelize = sequelize

        this.table_build()
        this.table_serve()
        this.table_event()

    }

    table_build = () => {

        this.collection = this.sequelize.define(this.name, {

            id: { primaryKey: true, type: DataTypes.STRING, defaultValue: () => Uid() },

            type: { type: DataTypes.STRING, defaultValue: '' },
            name: { type: DataTypes.STRING, defaultValue: '' },
            value: { type: DataTypes.TEXT, defaultValue: '' },

            createdAt: { type: DataTypes.STRING, defaultValue: () => Now() },
            updatedAt: { type: DataTypes.STRING, defaultValue: () => Now() },
            deletedAt: { type: DataTypes.STRING, defaultValue: null },

        }, { indexes: [{ unique: true, fields: ['type', 'name'] }] })

    }

    table_event = () => {

        this.collection.afterCreate(() => this.local.emit(this.name, 'create'))
        this.collection.afterUpdate(() => this.local.emit(this.name, 'update'))
        this.collection.afterUpsert(() => this.local.emit(this.name, 'upsert'))

    }

    table_serve = () => {

        this.local.on(`get-${this.name}`, async ({ query, user }: any) => await this.get(query, user), true, 2)
        this.local.on(`set-${this.name}`, async ({ query, user }: any) => await this.set(query, user), true, 4)

    }

    /*** *** *** @___Request_Validate___ *** *** ***/

    is_s = (s: any) => typeof s === 'string' && s.length > 0
    is_n = (n: any) => typeof n === 'number'

    /*** *** *** @___Table_Queries___ *** *** ***/

    get = async (args: any, { proj }: any) => await this.collection.findAll({
        where: {
            ...(proj === '*' ? {} : { name: { [Op.like]: `${proj}%` } }),
            ...args,
            deletedAt: null,
        },
        order: [['name', 'ASC']],
        raw: true,
    })

    set = async ({ type, name, value }: { type: string, name: string, value: string }, { proj }: any) => {

        if (this.is_s(type) && this.is_s(name)) {

            const [record, created] = await this.collection.upsert({ type, name, value, updatedAt: Now() }, { returning: true, raw: true })
            return record.isNewRecord ? 'Created' : 'Updated'

        } else throw new Error(`Type and Name must be string!`)

    }

}