var router = require('express').Router();
const entitiesController = require('../controllers/entities');

//Sub Routes
router.get('/', entitiesController.getTest);
router.post('/extract', entitiesController.extractEntities);

//export the router back to the index.js page
module.exports = router;