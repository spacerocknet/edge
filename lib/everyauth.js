var connect = require('connect')
  , __pause = connect.utils.pause
  , everyauth = module.exports = {};

everyauth.helpExpress = require('./everyauthlib/expressHelper');
everyauth.everymodule = require('./everyauthlib/modules/everymodule');

everyauth.everymodule.configurable({
  'User': 'A function that returns the mongoose User model (not Schema).'
});



everyauth.debug = false;

// The connect middleware. e.g.,
//     connect(
//         ...
//       , everyauth.middleware()
//       , ...
//     )
everyauth.middleware = function () {
  var app = connect(
      function registerReqGettersAndMethods (req, res, next) {
        var methods = everyauth._req._methods
          , getters = everyauth._req._getters;

        console.log(req.url);
 
        for (var name in methods) {
          req[name] = methods[name];
        }

        for (name in getters) {
          Object.defineProperty(req, name, {
            get: getters[name]
          });
        }
        next();
      }
    , function fetchUserFromSession (req, res, next) {
        var sess = req.session
          , auth = sess && sess.auth;

        if (!auth || !auth.userId) return next();
        var everymodule = everyauth.everymodule;
        if (!everymodule._findUserById) return next();
        var pause = __pause(req);
        everymodule._findUserById(auth.userId, function (err, user) {
          if (err) return next(err);
          if (user) req.user = user;
          else delete sess.auth;
          next();
          pause.resume();
        });
      }
    , connect.router(function (app) {
        var modules = everyauth.enabled
          , _module;

        for (var _name in modules) {
          _module = modules[_name];
          _module.validateSequences();
          _module.routeApp(app);
        }
      })
  );
  return app;
};

everyauth._req = {
    _methods: {}
  , _getters: {}
};

everyauth.addRequestMethod = function (name, fn) {
  this._req._methods[name] = fn;
  return this;
};

everyauth.addRequestGetter = function (name, fn, isAsync) {
  this._req._getters[name] = fn;
  return this;
};

everyauth
  .addRequestMethod('logout', function () {
    var req = this;
    delete req.session.auth;
  })
  .addRequestGetter('loggedIn', function () {
    var req = this;
    return !!(req.session && req.session.auth && req.session.auth.loggedIn);
  });

everyauth.modules = {};
everyauth.enabled = {};

// Grab all filenames in ./modules -- They correspond to the modules of the same name
// as the filename (minus '.js')
var fs = require('fs');
var files = fs.readdirSync(__dirname + '/everyauthlib/modules');
var includeModules = files.map( function (fname) {
  return fname.substring(0, fname.length - 3);
});
for (var i = 0, l = includeModules.length; i < l; i++) {
  var name = includeModules[i];

  // Lazy enabling of a module via `everyauth` getters
  // i.e., the `facebook` module is not loaded into memory
  // until `everyauth.facebook` is evaluated
  Object.defineProperty(everyauth, name, {
    get: (function (name) {
      return function () {
        var mod = this.modules[name] || (this.modules[name] = require('./everyauthlib/modules/' + name));
        // Make `everyauth` accessible from each auth strategy module
        if (!mod.everyauth) mod.everyauth = this;
        if (mod.shouldSetup)
          this.enabled[name] = mod;
        return mod;
      }
    })(name)
  });
};


var moduleLoadOrder = ['everymodule', 'facebook'];

everyauth.plugin = function plugin (schema, opts) {
  if (Object.keys(opts).length === 0)
    throw new Error('You must specify at least one module.');

  // Make sure to flag everymodule, so that we
  // run the everyauth defaults for everymodule later
  opts.everymodule || (opts.everymodule = true);

  moduleLoadOrder.filter( function (moduleName) {
    return moduleName in opts;
  }).forEach( function (moduleName) {
    var moduleOpts = opts[moduleName];
    if (moduleOpts === true) {
      moduleOpts = {};
    }

    var everyauthConfig = moduleOpts.everyauth || {};

    // Configure everyauth for this module 
    for (var k in everyauthConfig) {
      console.log(moduleName + "- k : " + k);
      everyauth[moduleName][k]( everyauthConfig[k] );
    }


    schema.static('createWithFB', function (fbUserMeta, accessToken, expires, callback) {
      var expiresDate = new Date;
      expiresDate.setSeconds(expiresDate.getSeconds() + expires);

      var params =  {
          uid : 'fb:' + fbUserMeta.id
        , fb: {
             id: fbUserMeta.id
           , accessToken: accessToken
           , expires: expiresDate
           , name: {
                full: fbUserMeta.name
              , first: fbUserMeta.first_name
              , last: fbUserMeta.last_name
            }
           , alias: fbUserMeta.link.match(/^http:\/\/www.facebook\.com\/(.+)/)[1]
           , gender: fbUserMeta.gender
           , email: fbUserMeta.email
           , timezone: fbUserMeta.timezone
           , locale: fbUserMeta.locale
           , verified: fbUserMeta.verified
           , updatedTime: fbUserMeta.updated_time
         }
         , likes: []
        
      };

      //params.likes = []
      params.likes.push({ name: 'VietCal',  category: 'Website'})

      //      Currently, this is not a valid way to check for enabled
      //if (everyauth.password)
      //  params[everyauth.password.loginKey()] = "fb:" + fbUserMeta.id; // Hack because of way mongodb treate unique indexes


      this.create(params, callback);
    });


  });

};


