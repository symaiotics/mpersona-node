var router = require('express').Router();
const infoController = require('../controllers/info');

//Sub Routes
router.get('/guestNames', infoController.getGuestNames);
router.get('/topics', infoController.getTopics);
router.get('/insertTopics', infoController.insertTopics);

//export the router back to the index.js page
module.exports = router;