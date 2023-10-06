var router = require('express').Router();
// const {checkAndAssignToken, validateAndRenewToken} = require('../middleware/verify');

//Import the controller(s)
const googleController = require('../controllers/google');

router.post('/upgrade',  googleController.upgradeCode);
router.post('/emails',  googleController.getEmails);

//export the router back to the index.js page
module.exports = router;