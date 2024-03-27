import { Host } from 'unet'
import { decodeENV, Uid, Now, Sfy } from 'utils'
import { DataTypes, Model, ModelStatic } from 'sequelize'
import { Sequelize, Op } from 'sequelize'

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
            type: { type: DataTypes.STRING, defaultValue: '' },
            name: { type: DataTypes.STRING, defaultValue: '' },
            data: { type: DataTypes.TEXT, defaultValue: '' },
            src: { type: DataTypes.STRING, defaultValue: me },
            dst: { type: DataTypes.STRING, defaultValue: '' },
            createdAt: { type: DataTypes.STRING, defaultValue: () => Now() },
            updatedAt: { type: DataTypes.STRING, defaultValue: () => Now() },
            deletedAt: { type: DataTypes.STRING, defaultValue: null },

        }, { indexes: [{ unique: false, fields: ['type', 'src', 'dst', 'updatedAt'] }] })

    }

    table_serve = () => {

        this.local.on(`get-${this.name}-status`, async (req: any) => await this.getStatus(req.query))

    }

    /*** *** *** @___Table_Queries___ *** *** ***/

    getStatus = async ({ id = '', updatedAt = '', limit = 10 }) => await this.collection.findAll({

        where: {
            type: 'status',
            dst: 'master',
            [Op.or]: [{ updatedAt: { [Op.gt]: updatedAt } }, { id: { [Op.gt]: id }, updatedAt: { [Op.eq]: updatedAt } }],
            deletedAt: null,
        },
        order: [['updatedAt', 'ASC'], ['id', 'ASC']],
        limit: limit,
        raw: true,

    })

}