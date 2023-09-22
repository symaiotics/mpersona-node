var router = require('express').Router();
const { checkAndAssignToken, validateAndRenewToken } = require('../middleware/verify');

//Get the controller
const filesController = require('../controllers/files');
// router.get('/parse', [checkAndAssignToken], filesController.parseFiles);

router.post('/', [checkAndAssignToken, validateAndRenewToken], filesController.uploadFiles);
router.post('/create', [checkAndAssignToken, validateAndRenewToken], filesController.createFiles);
router.post('/update', [checkAndAssignToken, validateAndRenewToken], filesController.updateFiles);

//export the router back to the index.js page
module.exports = router;