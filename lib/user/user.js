var KucooAuth = module.exports = {};


var mongoose = require('mongoose')
  , Schema = mongoose.Schema;

var UserSchema = new Schema({
  uid : String
  , fb: {
       id: String
     , accessToken: String
     , expires: Date
     , name: {
          full: String
        , first: String
        , last: String
       }
     , fbAlias: String
     , gender: String
     , email: String
     , timezone: String
     , locale: String
     , verified: Boolean
     , updatedTime: String
     , phone: String
   }
});


mongoose.model('User', UserSchema);

mongoose.connect('mongodb://localhost/kucoo');

//var User = mongoose.model('User');



KucooAuth.config = {};

KucooAuth.User = mongoose.model('User');

/*
KucooAuth.retrieveUser = function(config) {
  return function(req, res, next) {
    if (!req.session || !req.session.userId) {
      console.log("no userid in session");
      next();
    }
    else { //retrieve the whole user object from db

    }
  };
};

*/


KucooAuth.middleware = function() {
  return function(req, res, next) {
     console.log("In KucooAuth.middlewar");
          
     next();
  }
};



