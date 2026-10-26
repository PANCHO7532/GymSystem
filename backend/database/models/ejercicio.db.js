const Sequelize = require("sequelize");
const databaseManager = require("../index");

const Ejercicio = databaseManager.define("ejercicios", {
    "id": {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    "nombre": {
        type: Sequelize.STRING,
        allowNull: false
    },
    "grupoMuscular": {
        type: Sequelize.STRING,
        allowNull: false
    },
    "descripcion": {
        type: Sequelize.STRING,
        allowNull: false
    },
    "videoUrl": {
        type: Sequelize.STRING,
        allowNull: false
    },
    "estado": {
        type: Sequelize.BOOLEAN,
        allowNull: false
    }
});
module.exports = Ejercicio;