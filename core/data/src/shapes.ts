import { Host } from 'unet'
import { decodeENV, Uid, Now, Jfy } from 'utils'
import { DataTypes, Model, ModelStatic, Op } from 'sequelize'
import { Sequelize } from 'sequelize'

import { chunks, Responsive, Save } from './utils'

export class Shapes {

    public local: Host
    public sequelize: Sequelize

    public name = 'shapes'
    public collection: ModelStatic<Model<any, any>> & any
    public data: any = {}

    constructor({ local, sequelize }: { local: Host, sequelize: Sequelize }) {

        this.local = local
        this.sequelize = sequelize

        this.table_build()
        this.table_serve()
        this.table_event(() => this.local.emit(this.name, 'modify'), 1000)

    }

    /*** *** *** @___Table_Setup___ *** *** ***/

    table_build = () => {

        this.collection = this.sequelize.define(this.name, {

            id: { primaryKey: true, type: DataTypes.STRING, defaultValue: () => Uid() },

            proj: { type: DataTypes.STRING, allowNull: false, validate: { notEmpty: true } }, /** ER, VMP, Cullinan ... **/
            type: { type: DataTypes.STRING, allowNull: false, validate: { notEmpty: true } }, /** Polygon, Line, Circle, Dot ... **/
            name: { type: DataTypes.STRING, allowNull: false, validate: { notEmpty: true } }, /** S20, EX7300, S100 ... **/

            geojson: { type: DataTypes.TEXT, allowNull: false, validate: { notEmpty: true } },
            rules: { type: DataTypes.TEXT, defaultValue: null },  /** {} **/
            style: { type: DataTypes.TEXT, defaultValue: null },
            connect: { type: DataTypes.TEXT, defaultValue: null },

            user: { type: DataTypes.TEXT, defaultValue: null },
            createdAt: { type: DataTypes.STRING, defaultValue: () => Now() },
            updatedAt: { type: DataTypes.STRING, defaultValue: () => Now() },
            deletedAt: { type: DataTypes.STRING, defaultValue: null },

        }, {
            indexes: [
                { unique: false, name: `${this.name}_proj_index`, using: 'BTREE', fields: ['proj'] },
                { unique: false, name: `${this.name}_type_index`, using: 'BTREE', fields: ['type'] },
                { unique: false, name: `${this.name}_name_index`, using: 'BTREE', fields: ['name'] },
                { unique: false, name: `${this.name}_updatedat_index`, using: 'BTREE', fields: ['updatedAt'] },
            ]
        })

    }

    table_serve = () => {

        this.local.on(`get-${this.name}`, async (req: any) => await this.get(req), true, 1)
        this.local.on(`set-${this.name}`, async (req: any) => await this.set(req), true, 3)
        this.local.on(`del-${this.name}`, async (req: any) => await this.del(req), true, 3)

        this.local.on(`_get-${this.name}`, async (req: any) => await this.collection.findAll({
            where: { deletedAt: null },
            order: [['updatedAt', 'ASC']],
        }))

    }

    table_event = (cb: any, delay: number = 250) => {

        const { shake, call } = new Responsive()
        call(cb, delay)
        this.collection.afterCreate(() => { shake() })
        this.collection.afterUpdate(() => { shake() })
        this.collection.afterUpsert(() => { shake() })

    }

    /*** *** *** @___Table_Queries___ *** *** ***/

    get = async ({ path, query, user }: any) => {

        if (query.updatedAt) return await this.collection.findAll({
            where: { proj: user.proj, 'updatedAt': { [Op.gt]: query.updatedAt } },
            order: [['updatedAt', 'ASC']],
        })
        else return await this.collection.findAll({
            where: { proj: user.proj, deletedAt: null },
            order: [['updatedAt', 'ASC']],
        })

    }

    set = async ({ path, body, user }: any) => {

        body.proj = user.proj
        body.user = user.name

        if (typeof body.id === 'string' && body.id.length > 24) {

            if (body.delete === true) body.deletedAt = Now()

            return await this.collection.update({
                ...body,
                updatedAt: Now(),
            }, { where: { id: body.id }, individualHooks: true }) ? 'Updated!' : 'Update failed!'

        } else {

            delete body['id']

            return await this.collection.create({
                ...body,
                updatedAt: Now(),
                createdAt: Now(),
            }) ? 'Created!' : 'Create failed!'

        }

    }

    del = async ({ path, body, user }: any) => {

        console.log(` --- ${path} ---`)
        console.log(user)
        console.log(body)

        return await this.collection.update({
            user: user.name,
            updatedAt: Now(),
            deletedAt: Now()
        }, { where: { id: body.id }, individualHooks: true }) ? 'Deleted!' : 'Delete failed!'

    }


    /*** *** *** @___Table_Complex___ *** *** ***/

    insert = async (query: any) => {
        return {}
    }

}