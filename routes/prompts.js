var router = require('express').Router();
const promptController = require('../controllers/prompts');

//Sub Routes
router.post('/', promptController.simplePrompt);

//export the router back to the index.js page
module.exports = router;