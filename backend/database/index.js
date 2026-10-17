const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");
const configFile = require("../config.json").database;
const modelFiles = fs.readdirSync(path.join(__dirname, "models/"));

if(!configFile.mysqlHost) { console.log("[ERROR] No database hostname specified in your server configuration"); process.exit(1);}
if(!configFile.mysqlUsername) { console.log("[ERROR] No database username specified in your server configuration"); process.exit(1);}
//if(!configFile.mysqlPassword) { console.log("[ERROR] No database password specified in your server configuration"); process.exit(1);}
if(!configFile.mysqlDatabaseName) { console.log("[ERROR] No database name specified in your server configuration"); process.exit(1);}
const sequelizeInstance = new Sequelize(configFile.mysqlDatabaseName, configFile.mysqlUsername, configFile.mysqlPassword, {
    host: configFile.mysqlHost,
    port: configFile.mysqlPort || 3306,
    dialect: "mysql",
    define: {
        timestamps: false
    },
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});
module.exports = sequelizeInstance;
for(let a = 0; a < modelFiles.length; a++) {
    if(modelFiles[a].split(".")[1] != "db") { continue; }
    require(path.join(__dirname, "models/", modelFiles[a]));
}