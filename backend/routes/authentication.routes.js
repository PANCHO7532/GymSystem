const authController = require("../controllers/auth.controller");
module.exports = function(app, options, done) {
    app.post("/api/auth/login", authController.login);
    done();
}