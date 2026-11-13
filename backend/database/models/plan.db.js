const Sequelize = require("sequelize");
const databaseManager = require("../index");

const Plan = databaseManager.define("planes", {
    "idPlan": {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    "nombre": {
        type: Sequelize.STRING,
        allowNull: false
    },
    "precioMensual": {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
    },
    "activo": {
        type: Sequelize.BOOLEAN,
        defaultValue: true
    }
});
module.exports = Plan;