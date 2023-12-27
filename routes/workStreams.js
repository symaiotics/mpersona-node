var router = require('express').Router();
const { isAuthenticated, renewToken } = require('../middleware/verify');

//Get the controller
const workStreamsController = require('../controllers/workStreams');

//Recall
router.get('/', [isAuthenticated, renewToken], workStreamsController.getWorkStreams);

//Create
router.post('/', [isAuthenticated, renewToken], workStreamsController.createWorkStreams);
router.post('/update', [isAuthenticated, renewToken], workStreamsController.updateWorkStreams);

//Delete
router.get('/delete', [isAuthenticated, renewToken], workStreamsController.deleteWorkStream);


//export the router back to the index.js page
module.exports = router;