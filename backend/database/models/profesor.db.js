const Sequelize = require("sequelize");
const databaseManager = require("../index");

const Profesor = databaseManager.define("profesores", {
    "id": {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    "nombre": {
        type: Sequelize.STRING,
        allowNull: false
    },
    "apellido": {
        type: Sequelize.STRING,
        allowNull: false
    },
    "activo": {
        type: Sequelize.BOOLEAN,
        allowNull: false
    }
});
module.exports = Profesor;