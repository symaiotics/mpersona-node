var router = require('express').Router();
const personaController = require('../controllers/personas');

//Sub Routes
router.get('/', personaController.getPersonas);
router.get('/categories', personaController.getCategories);
router.get('/skills', personaController.getSkills);

//export the router back to the index.js page
module.exports = router;