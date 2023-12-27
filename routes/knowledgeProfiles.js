var router = require('express').Router();
const { isAuthenticated, isAdmin, renewToken } = require('../middleware/verify');

//Get the controller
const knowledgeProfileController = require('../controllers/knowledgeprofiles');

//Recall
router.get('/', [isAuthenticated, renewToken], knowledgeProfileController.getKnowledgeProfiles);

//Create / Update
router.post('/', [isAuthenticated, renewToken], knowledgeProfileController.createKnowledgeProfiles);
router.post('/update', [isAuthenticated, renewToken], knowledgeProfileController.updateKnowledgeProfiles);

//Link management
router.post('/addLink', [isAuthenticated, renewToken], knowledgeProfileController.addLink);
router.post('/linkDetails', [isAuthenticated, renewToken], knowledgeProfileController.linkDetails);
router.post('/acceptLink', [isAuthenticated, renewToken], knowledgeProfileController.acceptLink);

//export the router back to the index.js page
module.exports = router;