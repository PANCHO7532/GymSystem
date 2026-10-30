const pagosDatabase = require("../database/models/pago.db");
const membresiasDatabase = require("../database/models/membresia.db");
const sociosDatabase = require("../database/models/socio.db");
const planesDatabase = require("../database/models/plan.db");

const includeMembresia = [
    {
        model: membresiasDatabase,
        include: [
            { model: sociosDatabase, as: "socio", attributes: ["apellido", "nombre", "fotoUrl"] },
            { model: planesDatabase, as: "plan", attributes: ["nombre"] }
        ]
    }
];

// "2026-10-27" -> Date at 00:00 server-local time (see explanation about timezones)
function parseFecha(fecha) {
    return new Date(`${fecha}T00:00:00`);
}

// Flattens a pago row into the shape the frontend expects
function formatPago(pago) {
    const socio = pago.membresia.socio;
    return {
        idPago: pago.id,
        idMembresia: pago.idMembresia,
        nombreSocio: `${socio.apellido} ${socio.nombre}`,
        nombrePlan: pago.membresia.plan.nombre,
        fotoUrl: socio.fotoUrl,
        periodoMes: pago.periodoMes,
        periodoAnio: pago.periodoAnio,
        medioPago: pago.medioPago,
        fechaPago: pago.fechaPago,
        monto: Number(pago.monto),
        confirmado: pago.confirmado,
        estado: pago.confirmado,      // membresias.js reads "estado", pagos.js reads "confirmado"
        observaciones: pago.observaciones
    };
}

// GET /api/pagos
module.exports.getPagos = async function(req, res, next) {
    const pagos = await pagosDatabase.findAll({ include: includeMembresia });
    await res.code(200).send(pagos.map(formatPago));
};

// GET /api/pagos/membresia/:id
module.exports.getPagosPorMembresia = async function(req, res, next) {
    const pagos = await pagosDatabase.findAll({
        where: { idMembresia: req.params.id },
        include: includeMembresia,
        order: [["fechaPago", "DESC"]]
    });
    await res.code(200).send(pagos.map(formatPago));
};

// GET /api/pagos/periodo/total?mes=10&anio=2026
module.exports.getTotalPeriodo = async function(req, res, next) {
    const { mes, anio } = req.query;
    const total = await pagosDatabase.sum("monto", {
        where: { periodoMes: mes, periodoAnio: anio, confirmado: true }
    });
    await res.code(200).send({ totalRecaudado: Number(total) || 0 });
};

// POST /api/pagos
module.exports.postPagos = async function(req, res, next) {
    const { idMembresia, monto, medioPago, fechaPago, periodoMes, periodoAnio, estado, observaciones } = req.body;

    const pago = await pagosDatabase.create({
        idMembresia,
        monto,
        medioPago,
        fechaPago: parseFecha(fechaPago),
        periodoMes,
        periodoAnio,
        confirmado: estado === undefined ? true : estado,   // membresias.js doesn't send "estado"
        observaciones
    });

    // Reload with the joins so the response has the same shape as the list
    const creado = await pagosDatabase.findByPk(pago.id, { include: includeMembresia });
    await res.code(201).send(formatPago(creado));
};

// PUT /api/pagos/:id   (the frontend only ever sends { confirmado })
module.exports.putPagos = async function(req, res, next) {
    const pago = await pagosDatabase.findOne({ where: {id: req.params.id }});
    if (!pago) {
        return res.code(404).send({ title: "Pago no encontrado" });
    }

    await pago.update({ confirmado: req.body.confirmado });
    await res.code(200).send({ idPago: pago.id, confirmado: pago.confirmado, estado: pago.confirmado });
};

// DELETE /api/pagos/:id
module.exports.deletePagos = async function(req, res, next) {
    const eliminados = await pagosDatabase.destroy({ where: { id: req.params.id } });
    if (eliminados === 0) {
        return res.code(404).send({ title: "Pago no encontrado" });
    }

    await res.code(204).send();
};