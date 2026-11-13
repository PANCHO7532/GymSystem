const Sequelize = require("sequelize");
const databaseManager = require("../index");

const Pago = databaseManager.define("pagos", {
    "idPago": {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    "monto": {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
    },
    "medioPago": {
        type: Sequelize.STRING,
        allowNull: false
    },
    "fechaPago": {
        type: Sequelize.DATE,
        allowNull: false
    },
    "periodoMes": {
        type: Sequelize.STRING,
        allowNull: false,
        length: 2
    },
    "periodoAnio": {
        type: Sequelize.STRING,
        allowNull: false,
        length: 4
    },
    "confirmado": {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    "observaciones": {
        type: Sequelize.STRING,
        allowNull: true
    }
});
module.exports = Pago;