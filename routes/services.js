var router = require('express').Router();
const servicesController = require('../controllers/services');

//Sub Routes
router.get('/convertPi', servicesController.convertPi);

//export the router back to the index.js page
module.exports = router;