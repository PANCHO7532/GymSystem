module.exports = function(app, options, done) {
    app.get("/", async function(req, res, next) {
        await res.code(302).redirect("/login.html");
    });
    done();
}