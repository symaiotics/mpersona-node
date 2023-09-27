var router = require('express').Router();
const {checkAndAssignToken, validateAndRenewToken} = require('../middleware/verify');

//Get the controller
const knowledgeProfileController = require('../controllers/knowledgeprofiles');

//Recall
router.get('/', [checkAndAssignToken], knowledgeProfileController.getKnowledgeProfiles);

//Create / Update
router.post('/', [checkAndAssignToken], knowledgeProfileController.createKnowledgeProfiles);
router.post('/update', [checkAndAssignToken, validateAndRenewToken], knowledgeProfileController.updateKnowledgeProfiles);

//
router.post('/addLink', [checkAndAssignToken, validateAndRenewToken], knowledgeProfileController.addLink);

//export the router back to the index.js page
module.exports = router;