const testController = require("../controllers/test.controller");
module.exports = function(app, options, done) {
    app.get("/test", testController.test);
    done();
}