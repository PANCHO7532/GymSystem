const Sequelize = require("sequelize");
const databaseManager = require("../index");

const Egreso = databaseManager.define("egresos", {
    "idEgreso": {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    "concepto": {
        type: Sequelize.STRING,
        allowNull: false
    },
    "categoria": {
        type: Sequelize.STRING,
        allowNull: false
    },
    "clasificacion": {
        type: Sequelize.STRING,
        allowNull: false
    },
    "monto": {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
    },
    "fecha": {
        type: Sequelize.DATE,
        allowNull: false
    },
    "idColector": {
        type: Sequelize.INTEGER,
        allowNull: true
    },
    "confirmado": {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
});
module.exports = Egreso;
