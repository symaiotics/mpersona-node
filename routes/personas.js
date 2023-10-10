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
router.post('/update', [checkAndAssignToken, validateAndRenewToken], personaController.updatePersonas);

//Avatar
router.post('/avatar', [checkAndAssignToken], personaController.createAvatar);

//Delete
router.post('/delete', [checkAndAssignToken, validateAndRenewToken], personaController.deletePersonas);
// router.get('/deleteall', [checkAndAssignToken, validateAndRenewToken], personaController.deleteAllPersonas);

//Link personas
router.post('/addLink', [checkAndAssignToken, validateAndRenewToken], personaController.addLink);
router.post('/linkDetails', [checkAndAssignToken, validateAndRenewToken], personaController.linkDetails);
router.post('/acceptLink', [checkAndAssignToken, validateAndRenewToken], personaController.acceptLink);

//export the router back to the index.js page
module.exports = router;