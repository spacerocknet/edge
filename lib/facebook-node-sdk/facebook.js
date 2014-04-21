var KucooAuth = require('../user/user.js');
var util = require('util');

var BaseFacebook = require('./basefacebook.js');

function Facebook(config) {
  this.hasSession = !!(config.request && config.request.session);
  BaseFacebook.apply(this, arguments);
}

util.inherits(Facebook, BaseFacebook);

Facebook.prototype.setPersistentData = function(key, value) {
  if (this.hasSession) {
    this.request.session[key] = value;
  }
};

Facebook.prototype.getPersistentData = function(key, defaultValue) {
  if (this.hasSession) {
    return this.request.session[key] || defaultValue;
  }
  return defaultValue;
};

Facebook.prototype.clearPersistentData = function(key) {
  if (this.hasSession) {
    delete this.request.session[key];
  }
};

Facebook.prototype.clearAllPersistentData = function() {
  if (this.hasSession) {
    for (var name in this.sessionNameMap) {
      if (this.sessionNameMap.hasOwnProperty(name)) {
        this.clearPersistentData(this.sessionNameMap[name]);
      }
    }
  }
};

Facebook.middleware = function(config) {
  return function(req, res, next) {
    config.request = req;
    config.response = res;
    req.facebook = new Facebook(config);
    next();
  }
};




Facebook.loginRequired = function(config) {
  console.log('config ....');
  console.log(config);
  return function(req, res, next) {
    if (!req.facebook) {
      console.log("nnnnooooo req.facebook");
      Facebook.middleware(config)(req, res, afterNew);
    }
    else {
      console.log("About to run afterNew");
      afterNew();
    }
    function afterNew() {
      req.facebook.getUser(function(err, user) {
        if (err) {
          next(err);
          next = null;
        }
        else {
          if (user === 0) { 
            try {
              var loginUrl = req.facebook.getLoginUrl(config)
              console.log("loginUrl : " + loginUrl);
            }
            catch (err) {
              next(err);
              next = null;
              return;
            }
            res.redirect(loginUrl);
            next = null;
          }
          else {
            next();
            next = null;
          }
        }
      });
    }
  };
};





Facebook.canvasLoginRequired = function(config) {
  return function(req, res, next) {
    if (!req.facebook) {
      console.log("no req.facebook");
      Facebook.middleware(config)(req, res, afterNew);
    }
    else {
      console.log("About to run afterNew 222");
      afterNew();
    }

    function afterNew() {
      console.log("accessToken : ");
      console.log(req.facebook.accessToken);
      req.facebook.getUser(function(err, user) {
        if (err) {
          next(err);
          next = null;
        }
        else {
          if (user === 0) {
            var redirect_js_script = "<script>" +
                           "var oauth_url = 'https://www.facebook.com/dialog/oauth/';" +
                           "oauth_url += '?client_id=" + config.appId + "';" +
                           "oauth_url += '&redirect_uri=' + encodeURIComponent('https://apps.facebook.com/kucoome/');" +
                           "oauth_url += '&scope=email,read_stream,read_friendlists';" +
                           "window.top.location = oauth_url;" +
                           "</script>";


            res.send(redirect_js_script);
            next = null;
          } else if (req.session.kuser == null) {  //TODO: need to refress user profile by comparing to FB's udpated time
            req.session.userId = user;
            var User = KucooAuth.User;
 
            User.findOne({uid: 'fb:' + req.session.userId}, function (err, foundUser) {
                    if (foundUser) {
                       console.log("Found user .............................................." + foundUser);
                       req.session.kuser = foundUser;
                       next();
                       return;
                    } else {
                       console.log("Not found user by id - calling FB's me ");
                       req.facebook.api('/me', function(err, fbUser) {
                            req.session.user = fbUser;
                            var expiresDate = new Date;
                            expiresDate.setSeconds(expiresDate.getSeconds() + 7776000); //3 months
                            req.facebook.getAccessToken(function(err, accessToken) {
                               var params =  {
                                      uid : 'fb:' + fbUser.id
                                    , fb: {
                                            id: fbUser.id
                                          , accessToken: accessToken
                                          , expires: expiresDate
                                          , name: {
                                                   full: fbUser.name
                                                 , first: fbUser.first_name
                                                 , last: fbUser.last_name
                                            }
                                          , alias: fbUser.link.match(/^http:\/\/www.facebook\.com\/(.+)/)[1]
                                          , gender: fbUser.gender
                                          , email: fbUser.email
                                          , timezone: fbUser.timezone
                                          , locale: fbUser.locale
                                          , verified: fbUser.verified
                                          , updatedTime: fbUser.updated_time
                                      }
                                    , likes: []

                                   };
                              newUser = new User(params);
                              newUser.save( function (err, params) {
                                  if (err) {      
                                     console.err(err);
                                     next(err);
                                     return;
                                  } else {
                                     req.session.kuser = newUser;
                                     console.log("Successfully saved : " + params);
                                     next();
                                     return;
                                  }
                              });
                            }); 
                       });                   
                    }

                    
            });


          } else {
              next();
              next = null;
           }

          //next();
          //next = null;
        }
      });
    }
  };
};


module.exports = Facebook;

