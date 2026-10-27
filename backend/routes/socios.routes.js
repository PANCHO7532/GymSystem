const sociosController = require("../controllers/socios.controller");
module.exports = function(app, options, done) {
    app.get("/api/socios", sociosController.getSocios);
    app.post("/api/socios", sociosController.postSocios);
    app.put("/api/socios/:id", sociosController.putSocios);
    app.patch("/api/socios/:id/:activar", sociosController.patchSocios);
    app.delete("/api/socios/:id", sociosController.deleteSocios);
    done();
}