var router = require('express').Router();
const {checkAndAssignToken, validateAndRenewToken} = require('../middleware/verify');

//Import the controller(s)
const adminController = require('../controllers/admin');
router.get('/editorToAll',  adminController.editorToAll);

//export the router back to the index.js page
module.exports = router;