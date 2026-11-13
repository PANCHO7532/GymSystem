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

// Campos que PUT /api/pagos/:id puede modificar ("confirmado"/"estado" se maneja por separado)
const camposEditables = ["idMembresia", "monto", "medioPago", "fechaPago", "periodoMes", "periodoAnio", "observaciones"];

// Valida los datos de un pago. Devuelve { codigo, title } si hay algún error o null si todo está bien.
// Con esParcial = true (PUT) solo se validan los campos que realmente se enviaron.
async function validarPago(datos, esParcial) {
    const obligatorios = ["idMembresia", "monto", "medioPago", "fechaPago", "periodoMes", "periodoAnio"];
    for (const campo of obligatorios) {
        const valor = datos[campo];
        const vacio = valor === undefined || valor === null || valor === "";
        if (esParcial ? (valor !== undefined && vacio) : vacio) {
            return { codigo: 400, title: `Falta el campo ${campo}` };
        }
    }
    if (datos.monto !== undefined && !(Number(datos.monto) > 0)) {
        return { codigo: 400, title: "El monto debe ser un número mayor a 0" };
    }
    if (datos.fechaPago !== undefined && isNaN(parseFecha(datos.fechaPago))) {
        return { codigo: 400, title: "La fecha de pago no es válida" };
    }
    if (datos.confirmado !== undefined && typeof datos.confirmado !== "boolean") {
        return { codigo: 400, title: "El estado debe ser verdadero o falso" };
    }
    // Se verifica antes de insertar para que una idMembresia inexistente no termine en un error de clave foránea
    if (datos.idMembresia !== undefined && !(await membresiasDatabase.findByPk(datos.idMembresia))) {
        return { codigo: 404, title: "Membresía no encontrada" };
    }
    return null;
}

// Flattens a pago row into the shape the frontend expects
function formatPago(pago) {
    const socio = pago.membresia.socio;
    return {
        idPago: pago.idPago,
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
    const confirmado = estado === undefined ? true : estado;   // membresias.js doesn't send "estado"

    const error = await validarPago({ idMembresia, monto, medioPago, fechaPago, periodoMes, periodoAnio, confirmado }, false);
    if (error) {
        return res.code(error.codigo).send({ title: error.title });
    }

    const pago = await pagosDatabase.create({
        idMembresia,
        monto,
        medioPago,
        fechaPago: parseFecha(fechaPago),
        periodoMes,
        periodoAnio,
        confirmado,
        observaciones
    });

    // Reload with the joins so the response has the same shape as the list
    const creado = await pagosDatabase.findByPk(pago.idPago, { include: includeMembresia });
    await res.code(201).send(formatPago(creado));
};

// PUT /api/pagos/:id   (actualización parcial: cualquiera de camposEditables y/o confirmado, "estado" se acepta como alias)
module.exports.putPagos = async function(req, res, next) {
    const pago = await pagosDatabase.findByPk(req.params.id);
    if (!pago) {
        return res.code(404).send({ title: "Pago no encontrado" });
    }

    const datos = req.body || {};
    const confirmado = datos.confirmado !== undefined ? datos.confirmado : datos.estado;

    const error = await validarPago({ ...datos, confirmado }, true);
    if (error) {
        return res.code(error.codigo).send({ title: error.title });
    }

    // Solo se copian los campos permitidos para que no se pueda pisar la clave primaria ni nada más
    const cambios = {};
    for (const campo of camposEditables) {
        if (datos[campo] !== undefined) {
            cambios[campo] = datos[campo];
        }
    }
    if (cambios.fechaPago !== undefined) {
        cambios.fechaPago = parseFecha(cambios.fechaPago);
    }
    if (confirmado !== undefined) {
        cambios.confirmado = confirmado;
    }

    await pago.update(cambios);

    // Se recarga con los joins para que la respuesta tenga el mismo formato que el listado
    const actualizado = await pagosDatabase.findByPk(pago.idPago, { include: includeMembresia });
    await res.code(200).send(formatPago(actualizado));
};

// DELETE /api/pagos/:id
module.exports.deletePagos = async function(req, res, next) {
    const eliminados = await pagosDatabase.destroy({ where: { idPago: req.params.id } });
    if (eliminados === 0) {
        return res.code(404).send({ title: "Pago no encontrado" });
    }

    await res.code(204).send();
};