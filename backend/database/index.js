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

const {
    socios,
    planes,
    membresias,
    pagos,
    profesores,
    entrenamientos,
    clases,
    asistencias,
    ejercicios,
    rutinas,
    rutinasejercicios
} = sequelizeInstance.models;

module.exports.populateWithSampleData = async function() {
    // crear datos de prueba
    for(let a = 0; a < 4; a++) {
        await planes.create({nombre: "Plan " + (a+1), precioMensual: 1000 * (a+1), activo: (a % 2) ? false : true});
        await socios.create({
            apellido: "Apellido " + (a+1),
            nombre: "Nombre " + (a+1),
            dni: Math.round(Math.random()*100000000).toString(),
            telefono: Math.round(Math.random()*10000000000).toString(),
            email: "apellidonombre" + (a+1) + "@example.net",
            direccion: "Avenida Generica C" + (a+1) + ", Santa Maria, Catamarca, Argentina",
            fechaNacimiento: "2000-01-01",
            fechaAlta: Date.now(),
            fotoUrl: "https://wallpapers.com/images/high/blank-default-pfp-wue0zko1dfxs9z2c.jpg",
            activo: (a % 2) ? false : true
        });
        await membresias.create({
            idSocio: (a+1),
            idPlan: (a+1),
            fechaInicio: Date.now(),
            fechaVencimiento: Date.now()+(86400000*Math.round(Math.random()*10)),
            activo: true
        });
        await profesores.create({
            nombre: "ProfNombre " + (a+1),
            apellido: "ProfApellido " + (a+1),
            activo: (a % 2) ? false : true
        });
        await entrenamientos.create({
            nombre: "EntrenamientoGenerico" + (a+1)
        });
    }
}

// socios 1 ── N membresias
socios.hasMany(membresias, { foreignKey: { name: "idSocio", allowNull: false } });
membresias.belongsTo(socios, { as: "socio", foreignKey: { name: "idSocio", allowNull: false } });

// planes 1 ── N membresias
planes.hasMany(membresias, { foreignKey: { name: "idPlan", allowNull: false } });
membresias.belongsTo(planes, { as: "plan", foreignKey: { name: "idPlan", allowNull: false } });

// membresias 1 ── N pagos
membresias.hasMany(pagos, { foreignKey: { name: "idMembresia", allowNull: false } });
pagos.belongsTo(membresias, { foreignKey: { name: "idMembresia", allowNull: false } });

// socios 1 ── N asistencias
socios.hasMany(asistencias, { foreignKey: { name: "idSocio", allowNull: false } });
asistencias.belongsTo(socios, { foreignKey: { name: "idSocio", allowNull: false } });

// entrenamientos 1 ── N asistencias
entrenamientos.hasMany(asistencias, { foreignKey: { name: "idTipoEntrenamiento", allowNull: false } });
asistencias.belongsTo(entrenamientos, { foreignKey: { name: "idTipoEntrenamiento", allowNull: false } });

// entrenamientos 1 ── N clases
entrenamientos.hasMany(clases, { foreignKey: { name: "idTipoEntrenamiento", allowNull: false } });
clases.belongsTo(entrenamientos, { foreignKey: { name: "idTipoEntrenamiento", allowNull: false } });

// profesores 1 ── N clases
profesores.hasMany(clases, { foreignKey: { name: "idProfesor", allowNull: false } });
clases.belongsTo(profesores, { foreignKey: { name: "idProfesor", allowNull: false } });

// socios 1 ── N rutinas
socios.hasMany(rutinas, { foreignKey: { name: "idSocio", allowNull: false } });
rutinas.belongsTo(socios, { foreignKey: { name: "idSocio", allowNull: false } });

// profesores 1 ── N rutinas
profesores.hasMany(rutinas, { foreignKey: { name: "idProfesor", allowNull: false } });
rutinas.belongsTo(profesores, { foreignKey: { name: "idProfesor", allowNull: false } });

// rutinas 1 ── N rutinasejercicios
rutinas.hasMany(rutinasejercicios, { foreignKey: { name: "idRutina", allowNull: false } });
rutinasejercicios.belongsTo(rutinas, { foreignKey: { name: "idRutina", allowNull: false } });

// ejercicios 1 ── N rutinasejercicios
ejercicios.hasMany(rutinasejercicios, { foreignKey: { name: "idEjercicio", allowNull: false } });
rutinasejercicios.belongsTo(ejercicios, { foreignKey: { name: "idEjercicio", allowNull: false } });