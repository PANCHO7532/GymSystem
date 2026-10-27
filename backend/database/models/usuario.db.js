const Sequelize = require("sequelize");
const databaseManager = require("../index");

const Usuario = databaseManager.define("usuarios", {
    "idUsuario": {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    "email": {
        type: Sequelize.STRING,
        allowNull: false
    },
    "passwordHash": {
        type: Sequelize.STRING,
        allowNull: false
    },
    "rol": {
        type: Sequelize.STRING,
        allowNull: false
    }
});
module.exports = Usuario;