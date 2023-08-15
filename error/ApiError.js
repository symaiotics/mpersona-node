class ApiError {
    constructor(code, message) {
      this.code = code;
      this.message = message;
    }
  
    static badRequest(msg) {
      return new ApiError(400, msg);
    }

    //Added for unauth errors
    static unauthorized(msg) {
        return new ApiError(401, msg);
    }

    static internal(msg) {
      return new ApiError(500, msg);
    }
  }
  
  module.exports = ApiError;