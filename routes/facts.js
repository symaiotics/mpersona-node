var router = require('express').Router();
const { checkAndAssignToken, validateAndRenewToken } = require('../middleware/verify');

//Get the controller
const factController = require('../controllers/facts');

//Recall
router.get('/', [checkAndAssignToken, validateAndRenewToken], factController.getFacts);
router.post('/jsonl', [checkAndAssignToken, validateAndRenewToken], factController.getFactsByKnowledgeProfileUuids);

//Create
router.post('/', [checkAndAssignToken, validateAndRenewToken], factController.createFacts);
router.post('/search', [checkAndAssignToken, validateAndRenewToken], factController.searchFacts);



//export the router back to the index.js page
module.exports = router;