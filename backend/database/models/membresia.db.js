const Sequelize = require("sequelize");
const databaseManager = require("../index");

const Membresia = databaseManager.define("membresias", {
    "idMembresia": {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    "fechaInicio": {
        type: Sequelize.DATE,
        allowNull: false
    },
    "fechaVencimiento": {
        type: Sequelize.DATE,
        allowNull: false
    },
    "activo": {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
});
module.exports = Membresia;