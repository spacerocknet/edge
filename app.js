var express = require('express');

var thrift = require('thrift');

var QGen = require('./gen-nodejs/QGen.js'),
    ttypes = require('./gen-nodejs/kucoo_types');

var qgen_connection = thrift.createConnection('localhost', 9090),
    qgen_client = thrift.createClient(QGen, qgen_connection);


qgen_connection.on('error', function(err) {
  console.error(err);
});


var conf = require('./conf/oauth-providers');

var everyauth = require('./lib/everyauth')
  , Promise = everyauth.Promise;

everyauth.debug = true;


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
})
  , User;


UserSchema.plugin(everyauth.plugin, {
  everymodule: {
      everyauth: {
          User: function () {
            return User;
          }
        , findUserById: function (userId, fn) {
                           console.log("in findUserById ....");
                           //var stack = new Error().stack
                           //console.log("stack : " + stack);
                           this.User()().findById(userId, fn);
                        }
      }
    }
  , facebook: {
      everyauth: {
          myHostname: 'http://kucoo.me:80'
        , appId: conf.fb.appId
        , appSecret: conf.fb.appSecret
        , redirectPath: '/'
        , findOrCreateUser: function (sess, accessTok, accessTokExtra, fbUser) {
                              var promise = this.Promise()
                                  , User = this.User()();
                                  // TODO Check user in session or request helper first
                                  //      e.g., req.user or sess.auth.userId
                              console.log("In findOrCreateUser =================================");
                              User.findOne({'fb.id': fbUser.id}, function (err, foundUser) {
                                  if (foundUser) {
                                     console.log("Found user ..............................................");
                                     return promise.fulfill(foundUser);
                                  }
                                  console.log("CREATING");
                                  
                                  User.createWithFB(fbUser, accessTok, accessTokExtra.expires, function (err, createdUser) {
                                     var stack = new Error().stack
                                     console.log("stack : " + stack);
                                     console.log("fbUser : " + JSON.stringify(fbUser));

                                     if (err) return promise.fail(err);
                                        return promise.fulfill(createdUser);
                                     });
                                 });
                              return promise;
                            }
      }
    }
});
// Adds login: String

mongoose.model('User', UserSchema);

mongoose.connect('mongodb://localhost/kucoo');

User = mongoose.model('User');

var app = express.createServer(
    express.logger()
  , express.bodyParser()
  , express.static(__dirname + "/public")
  , express.cookieParser()
  , express.session({ secret: 'esoognom'})
  , everyauth.middleware()
);

app.configure( function () {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
});

app.get('/', function (req, res) {
  res.render('home');
});

app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});


app.get('/api/userprofile/:id', function (req, res) {
    console.log("user id : " + req.params.id);
    User.find({'uid': req.params.id},
               function (err, foundUser) {
                       if (!err)  {
                            return res.send(foundUser);
                       } else {
                            return console.log(err);
                       }
               });
});

/////////////////////Game API/////////////////////////////////
app.get('/api/game/categories', function (req, res) {
    console.log("Game categories");
    res.send("['film']");

});


/////////////////////////Film API/////////////////////////////
app.get('/api/getpopularmovies', function (req, res) {
    qgen_client.getPopularFilms("1", function(err, filmList) {
      if (err) {
        console.error(err);
      } else {
        //console.log("client retrieved:", filmList);
        res.send(filmList);
        //connection.end();
      }
   });
});


qgen_client.getPopularFilms("1", function(err, filmList) {
      if (err) {
        console.error(err);
      } else {
        console.log("client retrieved:", filmList);
      }
   });



everyauth.helpExpress(app);

app.listen(81);
