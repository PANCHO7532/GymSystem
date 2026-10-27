const Sequelize = require("sequelize");
const membresiasDatabase = require("../database/models/membresia.db");
const sociosDatabase = require("../database/models/socio.db");
const planesDatabase = require("../database/models/plan.db");

module.exports.getMembresias = async function(req, res, next) {
    const membresias = await membresiasDatabase.findAll({
        include: [
            { model: sociosDatabase, as: "socio", attributes: ["apellido", "nombre"] },
            { model: planesDatabase, as: "plan", attributes: ["nombre", "precioMensual"] }
        ]
    });

    const respuesta = membresias.map(membresia => ({
        idMembresia: membresia.idMembresia,
        idSocio: membresia.idSocio,
        idPlan: membresia.idPlan,
        nombreSocio: `${membresia.socio.apellido} ${membresia.socio.nombre}`,
        nombrePlan: membresia.plan.nombre,
        precioMensual: Number(membresia.plan.precioMensual),
        fechaInicio: membresia.fechaInicio,
        fechaVencimiento: membresia.fechaVencimiento,
        activo: membresia.activo
    }));

    await res.code(200).send(respuesta);
};

module.exports.getMembresiasPorVencer = async function(req, res, next) {
    const dias = parseInt(req.query.dias) || 7;

    const desde = new Date();
    desde.setHours(0, 0, 0, 0);                    // start of today
    const hasta = new Date(desde);
    hasta.setDate(hasta.getDate() + dias);
    hasta.setHours(23, 59, 59, 999);               // end of the last day

    const membresias = await membresiasDatabase.findAll({
        where: {
            activo: true,
            fechaVencimiento: { [Sequelize.Op.between]: [desde, hasta] }
        },
        include: [
            { model: sociosDatabase, as: "socio", attributes: ["apellido", "nombre"] },
            { model: planesDatabase, as: "plan", attributes: ["nombre", "precioMensual"] }
        ],
        order: [["fechaVencimiento", "ASC"]]
    });

    const respuesta = membresias.map(membresia => ({
        idMembresia: membresia.idMembresia,
        idSocio: membresia.idSocio,
        idPlan: membresia.idPlan,
        nombreSocio: `${membresia.socio.apellido} ${membresia.socio.nombre}`,
        nombrePlan: membresia.plan.nombre,
        precioMensual: Number(membresia.plan.precioMensual),
        fechaInicio: membresia.fechaInicio,
        fechaVencimiento: membresia.fechaVencimiento,
        activo: membresia.activo
    }));

    await res.code(200).send(respuesta);
};

module.exports.getPlanes = async function(req, res, next) {
    const planes = await planesDatabase.findAll();
    await res.code(200).send(planes);
};

module.exports.postMembresias = async function(req, res, next) {
    const {
        idSocio,
        idPlan,
        fechaInicio,
        fechaVencimiento
    } = req.body;
    await membresiasDatabase.create({idSocio, idPlan, fechaInicio: new Date(Date.parse(fechaInicio)).toISOString(), fechaVencimiento});
    await res.code(200).send();
};

module.exports.putMembresias = async function(req, res, next) {
    const membresia = await membresiasDatabase.findOne({where: {idMembresia: req.params.id}});
    if(!membresia) {
        await res.code(404).send();
        return;
    }
    for (const [key, value] of Object.entries(req.body)) {
        if (value !== null && value !== undefined) {
            membresia[key] = value;
        }
    }
    await membresia.save();
    await res.code(200).send();
};

module.exports.deleteMembresias = async function(req, res, next) {
    const membresia = await membresiasDatabase.findOne({where: {idMembresia: req.params.id}});
    if(!membresia) {
        await res.code(404).send();
        return;
    }
    await membresia.destroy();
    await res.code(200).send();
};