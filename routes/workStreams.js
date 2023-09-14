var router = require('express').Router();
const {checkAndAssignToken, validateAndRenewToken} = require('../middleware/verify');

//Get the controller
const workStreamsController = require('../controllers/workStreams');

//Recall
router.get('/', [checkAndAssignToken], workStreamsController.getWorkStreams);

//Create
router.post('/', [checkAndAssignToken], workStreamsController.createWorkStreams);
router.post('/update', [checkAndAssignToken, validateAndRenewToken], workStreamsController.updateWorkStreams);

//Delete
router.get('/delete', [checkAndAssignToken, validateAndRenewToken], workStreamsController.deleteWorkStream);


//export the router back to the index.js page
module.exports = router;