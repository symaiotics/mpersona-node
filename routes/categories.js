var router = require('express').Router();
const { isAuthenticated, isAdmin, renewToken } = require('../middleware/verify');

const categoryController = require('../controllers/categories');

//Sub Routes
router.get('/', [], categoryController.getCategories);
router.post('/', [], categoryController.createCategories);

//Admin functions
router.get('/deleteAll', [isAuthenticated, isAdmin, renewToken], categoryController.deleteAllCategories);
router.delete('/deleteAll', [isAuthenticated, isAdmin, renewToken], categoryController.deleteAllCategories);

//export the router back to the index.js page
module.exports = router;