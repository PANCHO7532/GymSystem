const Sequelize = require("sequelize");
const databaseManager = require("../index");

const Clase = databaseManager.define("clases", {
    "idClase": {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    "diaSemana": {
        type: Sequelize.STRING,
        allowNull: false
    },
    "horaInicio": {
        type: Sequelize.DATE,
        allowNull: false
    },
    "horaFin": {
        type: Sequelize.DATE,
        allowNull: false
    },
    "capacidadMax": {
        type: Sequelize.INTEGER,
        allowNull: false
    },
    "lugaresDisponible": {
        type: Sequelize.INTEGER,
        allowNull: false
    },
    "activo": {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
});
module.exports = Clase;