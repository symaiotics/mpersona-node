var router = require('express').Router();
const { isAuthenticated, isAdmin, renewToken } = require('../../middleware/verify');

//Get the controller
const categoriesController = require('../../controllers/knowledgeMapping/categories');

//Recall
router.get('/', [isAuthenticated, renewToken], categoriesController.getCategories);

//Create
router.post('/', [isAuthenticated, renewToken], categoriesController.createCategories);

//Update
router.patch('/', [isAuthenticated, renewToken], categoriesController.updateCategories);

//Delete
router.post('/delete', [isAuthenticated, renewToken], categoriesController.deleteCategories);

//export the router back to the index.js page
module.exports = router;