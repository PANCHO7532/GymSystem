const Sequelize = require("sequelize");
const databaseManager = require("../index");

const Socio = databaseManager.define("socios", {
    "id": {
        type: Sequelize.INTEGER,
        primaryKey: true
    },
    "apellido": {
        type: Sequelize.STRING,
        allowNull: false
    },
    "nombre": {
        type: Sequelize.STRING,
        allowNull: false
    },
    "apellido": {
        type: Sequelize.STRING,
        allowNull: false
    },
    "dni": {
        type: Sequelize.STRING,
        allowNull: false
    },
    "telefono": {
        type: Sequelize.STRING,
        allowNull: false
    },
    "email": {
        type: Sequelize.STRING,
        allowNull: false
    },
    "direccion": {
        type: Sequelize.STRING,
        allowNull: false
    },
    "fechaNacimiento": {
        type: Sequelize.DATE,
        allowNull: false
    },
    "fechaAlta": {
        type: Sequelize.DATE,
        allowNull: false
    },
    "fotoUrl": {
        type: Sequelize.STRING,
        allowNull: false
    },
    "activo": {
        type: Sequelize.BOOLEAN
    }
});
module.exports = Plan;