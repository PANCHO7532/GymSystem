exports.test = async function(req, res, next) {
    await res.code(200).send({"ok": 1});
}