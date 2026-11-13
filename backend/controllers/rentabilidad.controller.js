const Sequelize = require("sequelize");
const egresosDatabase = require("../database/models/egreso.db");
const colectoresDatabase = require("../database/models/colectorCosto.db");

function parseFecha(fecha) {
    return new Date(`${fecha}T00:00:00`);
}

function fechaValida(fecha) {
    if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
    const valor = parseFecha(fecha);
    return !isNaN(valor) && valor.getFullYear() === Number(fecha.slice(0, 4)) && valor.getMonth() + 1 === Number(fecha.slice(5, 7)) && valor.getDate() === Number(fecha.slice(8, 10));
}

function validarEgreso(datos, esParcial) {
    const obligatorios = ["concepto", "categoria", "clasificacion", "monto", "fecha"];
    for (const campo of obligatorios) {
        const valor = datos[campo];
        const vacio = valor === undefined || valor === null || valor === "";
        if (esParcial ? (valor !== undefined && vacio) : vacio) {
            return { codigo: 400, title: `Falta el campo ${campo}` };
        }
    }
    if (datos.concepto !== undefined && !String(datos.concepto).trim()) {
        return { codigo: 400, title: "El concepto es obligatorio" };
    }
    if (datos.categoria !== undefined && !String(datos.categoria).trim()) {
        return { codigo: 400, title: "La categoría es obligatoria" };
    }
    if (datos.monto !== undefined && !(Number(datos.monto) > 0)) {
        return { codigo: 400, title: "El monto debe ser un número mayor a 0" };
    }
    if (datos.fecha !== undefined && !fechaValida(datos.fecha)) {
        return { codigo: 400, title: "La fecha del egreso no es válida" };
    }
    if (datos.clasificacion !== undefined && !["directo", "indirecto"].includes(datos.clasificacion)) {
        return { codigo: 400, title: "La clasificación debe ser directa o indirecta" };
    }
    if (datos.confirmado !== undefined && typeof datos.confirmado !== "boolean") {
        return { codigo: 400, title: "El estado debe ser verdadero o falso" };
    }
    return null;
}

async function validarColector(idColector) {
    if (idColector === undefined || idColector === null || idColector === "") return null;
    if (!Number.isInteger(Number(idColector)) || Number(idColector) <= 0) return false;
    return await colectoresDatabase.findByPk(idColector);
}

module.exports.getColectores = async function(req, res, next) {
    const colectores = await colectoresDatabase.findAll({ order: [["nombre", "ASC"]] });
    await res.code(200).send(colectores);
};

module.exports.postColector = async function(req, res, next) {
    const { nombre, descripcion } = req.body || {};
    if (!nombre || !String(nombre).trim()) {
        return res.code(400).send({ title: "El nombre del colector es obligatorio" });
    }
    const existente = await colectoresDatabase.findOne({ where: Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("nombre")), String(nombre).trim().toLowerCase()) });
    if (existente) return res.code(409).send({ title: "Ya existe un colector con ese nombre" });
    const colector = await colectoresDatabase.create({ nombre: String(nombre).trim(), descripcion: descripcion || null });
    await res.code(201).send(colector);
};

module.exports.putColector = async function(req, res, next) {
    const colector = await colectoresDatabase.findByPk(req.params.id);
    if (!colector) return res.code(404).send({ title: "Colector no encontrado" });
    const { nombre, descripcion, activo } = req.body || {};
    if (nombre !== undefined && !String(nombre).trim()) return res.code(400).send({ title: "El nombre del colector es obligatorio" });
    if (activo !== undefined && typeof activo !== "boolean") return res.code(400).send({ title: "El estado debe ser verdadero o falso" });
    if (nombre !== undefined) {
        const existente = await colectoresDatabase.findOne({
            where: {
                [Sequelize.Op.and]: [
                    Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("nombre")), String(nombre).trim().toLowerCase()),
                    { idColector: { [Sequelize.Op.ne]: colector.idColector } }
                ]
            }
        });
        if (existente) return res.code(409).send({ title: "Ya existe un colector con ese nombre" });
        colector.nombre = String(nombre).trim();
    }
    if (descripcion !== undefined) colector.descripcion = descripcion || null;
    if (activo !== undefined) colector.activo = activo;
    await colector.save();
    await res.code(200).send(colector);
};

module.exports.deleteColector = async function(req, res, next) {
    const colector = await colectoresDatabase.findByPk(req.params.id);
    if (!colector) return res.code(404).send({ title: "Colector no encontrado" });
    await egresosDatabase.update({ idColector: null }, { where: { idColector: colector.idColector } });
    await colector.destroy();
    await res.code(204).send();
};

module.exports.getEgresos = async function(req, res, next) {
    const egresos = await egresosDatabase.findAll({
        include: [{ model: colectoresDatabase, as: "colector", attributes: ["idColector", "nombre"] }],
        order: [["fecha", "DESC"], ["idEgreso", "DESC"]]
    });
    await res.code(200).send(egresos.map(egreso => ({
        ...egreso.toJSON(),
        monto: Number(egreso.monto),
        nombreColector: egreso.colector ? egreso.colector.nombre : null
    })));
};

module.exports.postEgreso = async function(req, res, next) {
    const datos = req.body || {};
    const error = validarEgreso(datos, false);
    if (error) return res.code(error.codigo).send({ title: error.title });
    if (datos.idColector !== undefined && datos.idColector !== null && datos.idColector !== "") {
        const colector = await validarColector(datos.idColector);
        if (colector === false) return res.code(400).send({ title: "El colector seleccionado no es válido" });
        if (!colector) return res.code(404).send({ title: "Colector no encontrado" });
    }
    const egreso = await egresosDatabase.create({
        concepto: String(datos.concepto).trim(),
        categoria: String(datos.categoria).trim(),
        clasificacion: datos.clasificacion,
        monto: datos.monto,
        fecha: parseFecha(datos.fecha),
        idColector: datos.idColector || null,
        confirmado: datos.confirmado === undefined ? true : datos.confirmado
    });
    const creado = await egresosDatabase.findByPk(egreso.idEgreso, { include: [{ model: colectoresDatabase, as: "colector" }] });
    await res.code(201).send({ ...creado.toJSON(), monto: Number(creado.monto), nombreColector: creado.colector ? creado.colector.nombre : null });
};

module.exports.putEgreso = async function(req, res, next) {
    const egreso = await egresosDatabase.findByPk(req.params.id);
    if (!egreso) return res.code(404).send({ title: "Egreso no encontrado" });
    const datos = req.body || {};
    const error = validarEgreso(datos, true);
    if (error) return res.code(error.codigo).send({ title: error.title });
    if (datos.idColector !== undefined && datos.idColector !== null && datos.idColector !== "") {
        const colector = await validarColector(datos.idColector);
        if (colector === false) return res.code(400).send({ title: "El colector seleccionado no es válido" });
        if (!colector) return res.code(404).send({ title: "Colector no encontrado" });
    }
    const cambios = {};
    for (const campo of ["concepto", "categoria", "clasificacion", "monto", "confirmado"]) {
        if (datos[campo] !== undefined) cambios[campo] = datos[campo];
    }
    if (datos.fecha !== undefined) cambios.fecha = parseFecha(datos.fecha);
    if (datos.idColector !== undefined) cambios.idColector = datos.idColector || null;
    if (cambios.concepto !== undefined) cambios.concepto = String(cambios.concepto).trim();
    if (cambios.categoria !== undefined) cambios.categoria = String(cambios.categoria).trim();
    await egreso.update(cambios);
    const actualizado = await egresosDatabase.findByPk(egreso.idEgreso, { include: [{ model: colectoresDatabase, as: "colector" }] });
    await res.code(200).send({ ...actualizado.toJSON(), monto: Number(actualizado.monto), nombreColector: actualizado.colector ? actualizado.colector.nombre : null });
};

module.exports.deleteEgreso = async function(req, res, next) {
    const eliminados = await egresosDatabase.destroy({ where: { idEgreso: req.params.id } });
    if (eliminados === 0) return res.code(404).send({ title: "Egreso no encontrado" });
    await res.code(204).send();
};
