const rentabilidadController = require("../controllers/rentabilidad.controller");
module.exports = function(app, options, done) {
    app.get("/api/colectores-costos", rentabilidadController.getColectores);
    app.post("/api/colectores-costos", rentabilidadController.postColector);
    app.put("/api/colectores-costos/:id", rentabilidadController.putColector);
    app.delete("/api/colectores-costos/:id", rentabilidadController.deleteColector);
    app.get("/api/egresos", rentabilidadController.getEgresos);
    app.post("/api/egresos", rentabilidadController.postEgreso);
    app.put("/api/egresos/:id", rentabilidadController.putEgreso);
    app.delete("/api/egresos/:id", rentabilidadController.deleteEgreso);
    done();
}
