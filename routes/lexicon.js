var router = require('express').Router();
const { isAuthenticated, isAdmin, renewToken } = require('../middleware/verify');

//Get the controller
const lexiconController = require('../controllers/lexicon');

//Recall
router.get('/', [], lexiconController.getLexicon);

//Create / Update
router.post('/',[isAuthenticated, isAdmin, renewToken], lexiconController.updateLexicon);

//Delete
router.delete('/', [isAuthenticated, isAdmin, renewToken], lexiconController.deleteLexicon);

//export the router back to the index.js page
module.exports = router;