var router = require('express').Router();
const { isAuthenticated, renewToken, decodeValidToken } = require('../middleware/verify');

// Get the controller
const personaController = require('../controllers/personas');

// Recall
router.get('/', [decodeValidToken], personaController.getPersonas);
router.get('/skills', [decodeValidToken], personaController.getSkills);
router.get('/categories', [decodeValidToken], personaController.getCategories);

// Create / Update
router.post('/', [isAuthenticated, renewToken], personaController.createPersonas);
router.post('/update', [isAuthenticated, renewToken], personaController.updatePersonas);
router.post('/publish', [isAuthenticated, renewToken], personaController.publishPersonas);

// Avatar
router.post('/avatar', [isAuthenticated, renewToken], personaController.createAvatar);

// Delete
router.post('/delete', [isAuthenticated, renewToken], personaController.deletePersonas);
// router.get('/deleteall', [isAuthenticated, renewToken], personaController.deleteAllPersonas);

// Link personas
router.post('/addLink', [isAuthenticated, renewToken], personaController.addLink);
router.post('/linkDetails', [isAuthenticated, renewToken], personaController.linkDetails);
router.post('/acceptLink', [isAuthenticated, renewToken], personaController.acceptLink);

// Finetune models
router.post('/finetune', [isAuthenticated, renewToken], personaController.createFinetune);
router.post('/finetuneStatuses', [isAuthenticated, renewToken], personaController.loadFinetuneStatus);

// Export the router back to the index.js page
module.exports = router;