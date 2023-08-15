//Verify placeholder
//Called from specific APIs only

const verify = function (req, res, next) {
    console.log('auth verified')
    next()
}

module.exports = { verify }