var router = require('express').Router();
const { isAuthenticated, renewToken } = require('../middleware/verify');

//Get the controller
const shareLinksControler = require('../controllers/shareLinks');

//Recall
router.post('/add', [isAuthenticated, renewToken], shareLinksControler.addLink);
router.get('/details', [isAuthenticated, renewToken], shareLinksControler.linkDetails);
router.post('/accept', [isAuthenticated, renewToken], shareLinksControler.acceptLink);
router.post('/remove', [isAuthenticated, renewToken], shareLinksControler.removeLink);

//export the router back to the index.js page
module.exports = router;