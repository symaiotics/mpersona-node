//Logger placeholder

var logger = function (req, res, next) {
    // console.log('req logged')
    next()
}

module.exports = { logger }