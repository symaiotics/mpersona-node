var router = require('express').Router();
const { isAuthenticated, isAdmin, renewToken } = require('../../middleware/verify');

//Get the controller
const artifactsController = require('../../controllers/knowledgeMapping/artifacts');

//Recall
router.get('/', [isAuthenticated, renewToken], artifactsController.getArtifacts);

//Create
router.post('/', [isAuthenticated, renewToken], artifactsController.createArtifacts);

//Update
router.patch('/tags', [isAuthenticated, renewToken], artifactsController.addRemoveTags);
router.patch('/', [isAuthenticated, renewToken], artifactsController.updateArtifacts);

//Delete
router.post('/delete', [isAuthenticated, renewToken], artifactsController.deleteArtifacts);

//export the router back to the index.js page
module.exports = router;