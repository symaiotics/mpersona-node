var router = require('express').Router();
const { isAuthenticated, isAdmin, renewToken } = require('../middleware/verify');

//Get the controller
const filesController = require('../controllers/files');
// router.get('/parse', [checkAndAssignToken], filesController.parseFiles);

router.get('/', [isAuthenticated, renewToken], filesController.getFiles);
router.post('/', [isAuthenticated, renewToken], filesController.uploadFiles);
router.post('/create', [isAuthenticated, renewToken], filesController.createFiles);
router.post('/update', [isAuthenticated, renewToken], filesController.updateFiles);

//export the router back to the index.js page
module.exports = router;