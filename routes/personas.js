var router = require('express').Router();
const personaController = require('../controllers/personas');

//Recall
router.get('/', personaController.getPersonas);
router.get('/skills', personaController.getSkills);
router.get('/categories', personaController.getCategories);

//Create
router.post('/', personaController.createPersonas);

//Delete
router.get('/delete', personaController.deletePersona);
router.get('/deleteall', personaController.deleteAllPersonas);


//export the router back to the index.js page
module.exports = router;