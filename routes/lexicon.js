var router = require('express').Router();
const {checkAndAssignToken, validateAndRenewToken, verifyAdmin} = require('../middleware/verify');

//Get the controller
const lexiconController = require('../controllers/lexicon');

//Recall
router.get('/', [checkAndAssignToken], lexiconController.getLexicon);

//Create / Update
router.post('/', [checkAndAssignToken], lexiconController.updateLexicon);

//Delete
router.delete('/', [checkAndAssignToken, validateAndRenewToken, verifyAdmin], lexiconController.deleteLexicon);

//export the router back to the index.js page
module.exports = router;