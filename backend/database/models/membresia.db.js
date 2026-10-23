const Sequelize = require("sequelize");
const databaseManager = require("../index");

const Membresia = databaseManager.define("membresias", {
    "id": {
        type: Sequelize.INTEGER,
        primaryKey: true
    },
    "fechaInicio": {
        type: Sequelize.STRING,
        allowNull: false
    },
    "fechaVencimiento": {
        type: Sequelize.DATE,
        allowNull: false
    },
    "activo": {
        type: Sequelize.BOOLEAN,
        allowNull: false
    }
});
module.exports = Membresia;