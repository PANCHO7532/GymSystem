const Sequelize = require("sequelize");
const databaseManager = require("../index");

const Asistencia = databaseManager.define("asistencias", {
    "idAsistencia": {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    "fecha": {
        type: Sequelize.DATE,
        allowNull: false
    },
    "horaEntrada": {
        type: Sequelize.DATE,
        allowNull: false
    },
    "horaSalida": {
        type: Sequelize.DATE,
        allowNull: false
    },
    "activo": {
        type: Sequelize.BOOLEAN,
        allowNull: false
    }
});
module.exports = Asistencia;