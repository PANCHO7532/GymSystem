const Sequelize = require("sequelize");
const databaseManager = require("../index");

const TipoEntrenamiento = databaseManager.define("entrenamientos", {
    "id": {
        type: Sequelize.INTEGER,
        primaryKey: true
    },
    "nombre": {
        type: Sequelize.STRING,
        allowNull: false
    }
});
module.exports = TipoEntrenamiento;