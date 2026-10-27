const Sequelize = require("sequelize");
const databaseManager = require("../index");

const Rutina = databaseManager.define("rutinas", {
    "idRutina": {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    "nombre": {
        type: Sequelize.STRING,
        allowNull: false
    },
    "objetivo": {
        type: Sequelize.STRING,
        allowNull: false
    },
    "nivel": {
        type: Sequelize.STRING,
        allowNull: false
    },
    "diasSemana": {
        type: Sequelize.INTEGER,
        allowNull: false
    },
    "duracionMinutos": {
        type: Sequelize.INTEGER,
        allowNull: false
    },
    "tipo": {
        type: Sequelize.STRING,
        allowNull: false
    },
    "notas": {
        type: Sequelize.STRING,
        allowNull: false
    }
});
module.exports = Rutina;