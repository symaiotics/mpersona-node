var router = require('express').Router();
const validateAndRenewToken = require('../middleware/verify').validateAndRenewToken;
//Import the controller(s)
const accountsController = require('../controllers/accounts');

router.post('/', accountsController.createNewAccount);
router.post('/login', accountsController.login);
// router.post('/requestPasswordReset', accountsController.requestPasswordReset);
// router.post('/doPasswordReset', accountsController.doPasswordReset);
// router.post('/logout', [validateToken], accountsController.logout);
// router.delete('/', [validateToken], accountsController.deleteAccount);

//export the router back to the index.js page
module.exports = router;