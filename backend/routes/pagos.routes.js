const pagosController = require("../controllers/pagos.controller");
module.exports = function(app, options, done) {
    app.get("/api/pagos", pagosController.getPagos);
    app.get("/api/pagos/membresia/:id", pagosController.getPagosPorMembresia);
    app.get("/api/pagos/periodo/total", pagosController.getTotalPeriodo);
    app.post("/api/pagos", pagosController.postPagos);
    app.put("/api/pagos/:id", pagosController.putPagos);
    app.delete("/api/pagos/:id", pagosController.deletePagos);
    done();
}