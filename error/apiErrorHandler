
require('dotenv').config()
const ApiError = require('./ApiError');

function apiErrorHandler(err, req, res, next) {

  if (err instanceof ApiError) {
    res.status(err.code).json(err.message);
    return;
  }

  if(process.env.MODE == 'DEV')
  {
    // console.log(err.message);
    res.status(err.code || 500).json({message:err.message});    
    //May not want to log the error
  }
  else //All non-DEV environments such as QA/PROD/UT etc.
  {
    //Most definitely want to log the error in some sort of logger
    //TODO : Persist the real error into the DB (err.message)
    res.status(500).json({message:'Generic server error message.'});    
  }

}

module.exports = apiErrorHandler;