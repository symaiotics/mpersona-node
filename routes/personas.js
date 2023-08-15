var router = require('express').Router();
const personaController = require('../controllers/personas');

//Sub Routes
router.get('/', personaController.getPersonas);

//export the router back to the index.js page
module.exports = router;