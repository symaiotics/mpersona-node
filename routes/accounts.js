var router = require('express').Router();

//Import the controller(s)
const accountsController = require('../controllers/accounts');
router.post('/',  accountsController.createNewAccount);
router.post('/login', accountsController.login);
router.post('/mailingList', accountsController.joinMailingList);

//export the router back to the index.js page
module.exports = router;