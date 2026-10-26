const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const serverConfiguration = require("../config.json").server;
const userDatabase = require("../database/models/usuario.db");

module.exports.login = async function(req, res, next) {
    let {email, password} = req.body;
    if(await userDatabase.count() == 0) {
        // first user in database is always admin
        let passwordHash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
        await userDatabase.create({ email, passwordHash, rol: "Admin" });
    }
    let userQuery = await userDatabase.findOne({ where: { email }});
    if(!userQuery) {
        await res.code(401).send();
        return;
    }
    if(!bcrypt.compareSync(password, userQuery.passwordHash)) {
        await res.code(401).send();
        return;
    }
    let token = jwt.sign({email}, serverConfiguration.jwtSecretKey, { expiresIn: serverConfiguration.jwtExpiration });
    await res.code(200).send({email, token, "rol": userQuery.rol, "expira": new Date(Date.now()+require("ms")(serverConfiguration.jwtExpiration))})
    return;
}

module.exports.register = async function(req, res, next) {
    
}