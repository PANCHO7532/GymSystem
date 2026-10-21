const fs = require("fs");
const path = require("path");
const database = require("./database");
const configFile = require("./config.json").server;
const fastify = require("fastify")({logger: isDevelopment() ? true : false});
const routeList = fs.readdirSync("./routes");

for(let a = 0; a < routeList.length; a++) {
    if(routeList[a].split(".")[1] != "routes") { continue; }
    fastify.register(require(path.join(__dirname, "routes/", routeList[a])));
}

function isDevelopment() {
    return process.env.NODE_ENV === "development";
}
fastify.register(require("@fastify/static"), { root: path.join(__dirname, '../frontend') });

fastify.register(require("@fastify/cors"), {
    origin: "*"
});

fastify.listen({port: configFile.listenPort, host: configFile.listenHost}, async(err, addr) => {
    if(err) { console.log(`[ERROR] ${err}`); process.exit(1); }
    console.log(`[INFO] Server started at ${configFile.listenHost} in port ${configFile.listenPort}`);
    //fastify.swagger();
    try {
        await database.sync({
            alter: isDevelopment() ? true : false,
            force: isDevelopment() ? true : false,
            logging: isDevelopment() ? console.log : false
        });
    } catch(e) { console.log(`[ERROR] Couldn't sync database! ${e}`); }
    if(isDevelopment()) {
        //database.populateWithSampleData();
    }
});
module.exports = fastify;