var router = require('express').Router();
const { isAuthenticated, isAdmin, renewToken } = require('../middleware/verify');

//Get the controller
const factController = require('../controllers/facts');

//Recall
router.get('/', [isAuthenticated, renewToken], factController.getFacts);
router.post('/jsonl', [isAuthenticated, renewToken], factController.getFactsByKnowledgeProfileUuids);

//Create
router.post('/', [isAuthenticated, renewToken], factController.createFacts);
router.post('/search', [isAuthenticated, renewToken], factController.searchFacts);



//export the router back to the index.js page
module.exports = router;