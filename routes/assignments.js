var router = require('express').Router();
const { isAuthenticated, isAdmin, renewToken } = require('../middleware/verify');

//Get the controller
const assignmentController = require('../controllers/assignments');

//Recall
router.get('/', [], assignmentController.getAssignments);

//Create
router.post('/', [isAuthenticated, renewToken], assignmentController.createAssignments);

//Delete
router.delete('/', [isAuthenticated, renewToken], assignmentController.deleteAssignments);

//export the router back to the index.js page
module.exports = router;