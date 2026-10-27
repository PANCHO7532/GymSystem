const Sequelize = require("sequelize");
const databaseManager = require("../index");

const TipoEntrenamiento = databaseManager.define("entrenamientos", {
    "idTipoEntrenamiento": {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    "nombre": {
        type: Sequelize.STRING,
        allowNull: false
    }
});
module.exports = TipoEntrenamiento;