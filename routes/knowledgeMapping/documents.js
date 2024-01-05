var router = require('express').Router();
const { isAuthenticated, isAdmin, renewToken } = require('../../middleware/verify');

//Get the controller
const documentsController = require('../../controllers/knowledgeMapping/documents');

//Recall
router.get('/', [isAuthenticated, renewToken], documentsController.getDocuments);

//Create
router.post('/', [isAuthenticated, renewToken], documentsController.createDocuments);

//Update
router.patch('/tags', [isAuthenticated, renewToken], documentsController.addRemoveTags);
router.patch('/', [isAuthenticated, renewToken], documentsController.updateDocuments);

//Delete
router.post('/delete', [isAuthenticated, renewToken], documentsController.deleteDocuments);

//export the router back to the index.js page
module.exports = router;