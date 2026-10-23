const Sequelize = require("sequelize");
const databaseManager = require("../index");

const RutinaEjercicio = databaseManager.define("rutinasejercicios", {
    "id": {
        type: Sequelize.INTEGER,
        primaryKey: true
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
module.exports = Membresia;