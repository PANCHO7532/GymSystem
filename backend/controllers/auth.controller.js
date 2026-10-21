module.exports.login = async function(req, res, next) {
    await res.code(200).send({"token": "sample", "rol": "Admin", "expira": ""})
}