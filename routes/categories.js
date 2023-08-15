var router = require('express').Router();
const categoryController = require('../controllers/categories');

//Sub Routes
router.get('/', categoryController.getCategories);
router.post('/', categoryController.createCategories);

//Admin functions
router.get('/delete', categoryController.deleteAllCategories);
router.delete('/', categoryController.deleteAllCategories);

//export the router back to the index.js page
module.exports = router;