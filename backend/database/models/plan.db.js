const Sequelize = require("sequelize");
const databaseManager = require("../index");

const Plan = databaseManager.define("planes", {
    "id": {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    "nombre": {
        type: Sequelize.STRING,
        allowNull: false
    },
    "precioMensual": {
        type: Sequelize.DECIMAL,
        allowNull: false
    },
    "activo": {
        type: Sequelize.BOOLEAN
    }
});
module.exports = Plan;