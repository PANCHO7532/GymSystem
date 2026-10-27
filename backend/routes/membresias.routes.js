const membresiasController = require("../controllers/membresias.controller");
module.exports = function(app, options, done) {
    app.get("/api/membresias", membresiasController.getMembresias);
    app.get("/api/membresias/por-vencer", membresiasController.getMembresiasPorVencer);
    app.post("/api/membresias", membresiasController.postMembresias);
    app.put("/api/membresias/:id", membresiasController.putMembresias);
    app.delete("/api/membresias/:id", membresiasController.deleteMembresias);
    // lista de planes
    app.get("/api/planes", membresiasController.getPlanes);
    done();
}