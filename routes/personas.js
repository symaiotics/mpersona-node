var router = require('express').Router();
const {checkAndAssignToken, validateAndRenewToken} = require('../middleware/verify');

//Get the controller
const personaController = require('../controllers/personas');

//Recall
router.get('/', [checkAndAssignToken], personaController.getPersonas);
router.get('/skills', [checkAndAssignToken], personaController.getSkills);
router.get('/categories', [checkAndAssignToken], personaController.getCategories);

//Create
router.post('/', [checkAndAssignToken], personaController.createPersonas);

//Delete
router.get('/delete', [checkAndAssignToken, validateAndRenewToken], personaController.deletePersona);
router.get('/deleteall', [checkAndAssignToken, validateAndRenewToken], personaController.deleteAllPersonas);


//export the router back to the index.js page
module.exports = router;