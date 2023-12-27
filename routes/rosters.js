var router = require('express').Router();
const { isAuthenticated, renewToken } = require('../middleware/verify');

//Get the controller
const rosterController = require('../controllers/rosters');

//Recall
router.get('/', [isAuthenticated, renewToken], rosterController.get);
router.get('/uuid', [isAuthenticated, renewToken], rosterController.getFromUuid);

//Create / Update
router.post('/', [isAuthenticated, renewToken], rosterController.create);
router.post('/update', [isAuthenticated, renewToken], rosterController.update);

//Link management
router.post('/addLink', [isAuthenticated, renewToken], rosterController.addLink);
router.post('/linkDetails', [isAuthenticated, renewToken], rosterController.linkDetails);
router.post('/acceptLink', [isAuthenticated, renewToken], rosterController.acceptLink);

//export the router back to the index.js page
module.exports = router;