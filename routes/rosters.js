var router = require('express').Router();
const {checkAndAssignToken, validateAndRenewToken} = require('../middleware/verify');

//Get the controller
const rosterController = require('../controllers/rosters');

//Recall
router.get('/', [checkAndAssignToken], rosterController.get);
router.get('/uuid', [checkAndAssignToken], rosterController.getFromUuid);

//Create / Update
router.post('/', [checkAndAssignToken], rosterController.create);
router.post('/update', [checkAndAssignToken, validateAndRenewToken], rosterController.update);

//Link management
router.post('/addLink', [checkAndAssignToken, validateAndRenewToken], rosterController.addLink);
router.post('/linkDetails', [checkAndAssignToken, validateAndRenewToken], rosterController.linkDetails);
router.post('/acceptLink', [checkAndAssignToken, validateAndRenewToken], rosterController.acceptLink);

//export the router back to the index.js page
module.exports = router;