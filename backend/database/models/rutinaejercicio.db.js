const Sequelize = require("sequelize");
const databaseManager = require("../index");

const RutinaEjercicio = databaseManager.define("rutinasejercicios", {
    "idRutinaEjercicio": {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    "orden": {
        type: Sequelize.INTEGER,
        allowNull: false
    },
    "series": {
        type: Sequelize.STRING,
        allowNull: false
    },
    "repeticiones": {
        type: Sequelize.STRING,
        allowNull: false
    },
    "descansoSeg": {
        type: Sequelize.INTEGER,
        allowNull: false
    }
});
module.exports = RutinaEjercicio;