var router = require('express').Router();
const verify = require('../middleware/verify').verify;
//Import the controller(s)
const accountsController = require('../controllers/accounts');

//Sub Routes
router.get('/', accountsController.getAccounts);

//The verify middleware is called before the controller is called
//Verify, and other middlware, can selectively be called per each sub route 
router.post('/', [verify],  accountsController.postNewAccount);

//export the router back to the index.js page
module.exports = router;