var router = require('express').Router();
const { isAuthenticated, isAdmin, renewToken } = require('../../middleware/verify');

//Get the controller
const tagsController = require('../../controllers/knowledgeMapping/tags');

//Recall
router.get('/', [isAuthenticated, renewToken], tagsController.getTags);

//Create
router.post('/', [isAuthenticated, renewToken], tagsController.createTags);

//Update
router.patch('/', [isAuthenticated, renewToken], tagsController.updateTags);

//Delete
router.post('/delete', [isAuthenticated, renewToken], tagsController.deleteTags);

//export the router back to the index.js page
module.exports = router;