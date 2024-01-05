var router = require('express').Router();
const { isAuthenticated, isAdmin, renewToken } = require('../../middleware/verify');

//Get the controller
const segmentsController = require('../../controllers/knowledgeMapping/segments');

//Recall
router.get('/', [isAuthenticated, renewToken], segmentsController.getSegments);

//Create
router.post('/', [isAuthenticated, renewToken], segmentsController.createSegments);

//Update
router.patch('/tags', [isAuthenticated, renewToken], segmentsController.addRemoveTags);
router.patch('/', [isAuthenticated, renewToken], segmentsController.updateSegments);

//Delete
router.post('/delete', [isAuthenticated, renewToken], segmentsController.deleteSegments);

//export the router back to the index.js page
module.exports = router;