const Sequelize = require("sequelize");
const databaseManager = require("../index");

const Test = databaseManager.define("test", {
    "test": {
        type: Sequelize.STRING,
        allowNull: false
    }
});
module.exports = Test;