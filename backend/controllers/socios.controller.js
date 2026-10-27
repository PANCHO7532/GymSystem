const serverConfiguration = require("../config.json").server;
const sociosDatabase = require("../database/models/socio.db");

module.exports.getSocios = async function(req, res, next) {
    const socios = await sociosDatabase.findAll();
    await res.code(200).send(socios);
};

module.exports.postSocios = async function(req, res, next) {
    const {
        apellido,
        nombre,
        dni,
        telefono,
        email,
        direccion,
        fechaNacimiento,
        fotoUrl
    } = req.body;
    await sociosDatabase.create({apellido, nombre, dni, telefono, email, direccion, fechaNacimiento, fotoUrl, fechaAlta: Date.now()});
    await res.code(200).send();
    return
};

module.exports.putSocios = async function(req, res, next) {
    const socio = await sociosDatabase.findOne({where: {idSocio: req.params.id}});
    if(!socio) {
        await res.code(404).send();
        return;
    }
    for (const [key, value] of Object.entries(req.body)) {
        if (value !== null && value !== undefined) {
            socio[key] = value;
        }
    }
    await socio.save();
    await res.code(200).send();
    return;
};

module.exports.patchSocios = async function(req, res, next) {
    req.body = {};
    const socio = await sociosDatabase.findOne({where: {idSocio: req.params.id}});
    if(!socio) {
        await res.code(404).send();
        return;
    }
    switch(req.params.activar) {
        case "activar":
            socio.activo = true;
            break;
        case "desactivar":
            socio.activo = false;
            break;
    }
    await socio.save();
    await res.code(200).send();
    return;
};

module.exports.deleteSocios = async function(req, res, next) {
    const socio = await sociosDatabase.findOne({where: {idSocio: req.params.id}});
    if(!socio) {
        await res.code(404).send();
        return;
    }
    await socio.destroy();
    await res.code(200).send();
    return;
};