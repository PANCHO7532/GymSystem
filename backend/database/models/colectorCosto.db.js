const Sequelize = require("sequelize");
const databaseManager = require("../index");

const ColectorCosto = databaseManager.define("colectoresCostos", {
    "idColector": {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    "nombre": {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
    },
    "descripcion": {
        type: Sequelize.STRING,
        allowNull: true
    },
    "activo": {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
});
module.exports = ColectorCosto;
