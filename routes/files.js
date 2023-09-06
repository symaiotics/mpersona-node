var router = require('express').Router();
const {checkAndAssignToken, validateAndRenewToken} = require('../middleware/verify');

//Get the controller
const filesController = require('../controllers/files');
// router.get('/parse', [checkAndAssignToken], filesController.parseFiles);

router.post('/', [checkAndAssignToken], filesController.uploadFiles);


//export the router back to the index.js page
module.exports = router;