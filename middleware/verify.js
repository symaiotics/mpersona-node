const jwt = require('jsonwebtoken');
const uuidv4 = require('uuid').v4;

// const validateToken = (req, res, next) => {
//     const authHeader = req.headers.authorization;

//     if (authHeader) {
//         const token = authHeader.split(' ')[1];

//         jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
//             if (err) {
//                 return res.sendStatus(403);
//             }

//             req.user = user;
//             next();
//         });
//     } else {
//         res.sendStatus(401);
//     }
// };


const checkAndAssignToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
            if (err) {
                // return res.sendStatus(403);
            }
            req.token = token;
            req.tokenDecoded = jwt.decode(token);
        });
    }
    // console.log("OK req.token", req.token)
    next();

};

const validateAndRenewToken = (req, res, next) => {

    //If the token has been decoded and is good, then we can proceed
    //We also mint a new token if it is expiring
    if (req.tokenDecoded) {

        //If the token is about to explore within 20 minutes generate a new token and attach it as a response header
        const expirationDate = new Date(req.tokenDecoded.exp * 1000);
        const twentyMinutesFromNow = new Date(Date.now() + 20 * 60 * 1000);
        if (expirationDate < twentyMinutesFromNow) {
            var newToken = createJWT(req.tokenDecoded, req.fullUrl)
            res.header('auth-token', newToken.token)
            res.header('auth-token-decoded', JSON.stringify(newToken.tokenDecoded))


        }
        // console.log("OK Validated", req.token)
        next();
    }
    else {
        return res.sendStatus(403);
    }
};

function createJWT(account, source) {
    // Payload
    const tokenDecoded = {
        username: account.username,
        roles: account.roles,
        aud: 'mPersona-node',
        iss: source,
        nbf: Math.floor(Date.now() / 1000),
        jti: uuidv4(),
        iat: Math.floor(Date.now() / 1000), // current time in seconds
        exp: Math.floor(Date.now() / 1000) + (120 * 60) // expiry time in seconds (120 minutes from now)
    };

    // Create JWT
    const token = jwt.sign(tokenDecoded, process.env.JWT_SECRET);
    return { token, tokenDecoded };
}

// Middleware to check if the user is an admin
function verifyAdmin(req, res, next) {
    const roles = req.tokenDecoded?.roles || [];
    if (!roles.includes('admin')) {
        return res.status(403).send({ message: "Access denied. Only admins can perform this action." });
    }
    next();
}


module.exports = { checkAndAssignToken, validateAndRenewToken, createJWT, verifyAdmin };

