var router = require('express').Router();
const { isAuthenticated, isAdmin, renewToken } = require('../../middleware/verify');

//Get the controller
const knowledgeSetController = require('../../controllers/knowledgeMapping/knowledgeSets');

//Recall
router.get('/', [isAuthenticated, renewToken], knowledgeSetController.getKnowledgeSets);

//Create
router.post('/', [isAuthenticated, renewToken], knowledgeSetController.createKnowledgeSets);

//Update
router.patch('/', [isAuthenticated, renewToken], knowledgeSetController.updateKnowledgeSets);

//Delete
router.post('/delete', [isAuthenticated, renewToken], knowledgeSetController.deleteKnowledgeSets);

//export the router back to the index.js page
module.exports = router;