const configuracion = require("../config.json");

module.exports = function(app, options, done) {
    app.get("/api/config", async function(req, res, next) {
        const website = configuracion.website || {};
        res.header("Cache-Control", "no-store");
        await res.code(200).send({
            website: {
                title: website.title || "GymSystem",
                logoPath: website.logoPath || ""
            }
        });
    });
    app.get("/", async function(req, res, next) {
        await res.code(302).redirect("/login.html");
    });
    done();
}