var router = require('express').Router();
const { checkAndAssignToken, validateAndRenewToken } = require('../middleware/verify');

const categoryController = require('../controllers/categories');

//Sub Routes
router.get('/', categoryController.getCategories);
router.post('/', categoryController.createCategories);

//Admin functions
router.get('/deleteAll', [checkAndAssignToken, validateAndRenewToken], categoryController.deleteAllCategories);
router.delete('/deleteAll', [checkAndAssignToken, validateAndRenewToken], categoryController.deleteAllCategories);

//export the router back to the index.js page
module.exports = router;