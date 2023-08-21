var router = require('express').Router();
const {checkAndAssignToken, validateAndRenewToken} = require('../middleware/verify');

//Import the controller(s)
const accountsController = require('../controllers/accounts');

router.post('/',  accountsController.createNewAccount);
router.post('/login', accountsController.login);
// router.get('/login', accountsController.login);
// router.post('/requestPasswordReset', accountsController.requestPasswordReset);
// router.post('/doPasswordReset', accountsController.doPasswordReset);
// router.post('/logout', [checkAndAssignToken], accountsController.logout);
// router.delete('/', [validateToken], accountsController.deleteAccount);

//export the router back to the index.js page
module.exports = router;