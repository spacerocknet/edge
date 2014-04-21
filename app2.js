var thrift = require('thrift');

var QGen = require('./gen-nodejs/QGen.js'),
    ttypes = require('./gen-nodejs/kucoo_types');

//var qgen_connection = thrift.createConnection('localhost', 9090),
var qgen_connection = thrift.createConnection('localhost', 80),
    qgen_client = thrift.createClient(QGen, qgen_connection);


qgen_connection.on('error', function(err) {
  console.error(err);
});

qgen_connection.on('connect', function(err) {
  console.log("qgen connection is good now!");
});


const crypto = require('crypto'),
      fs = require("fs");
var http = require('http');
var https = require('https');

var express = require('express');
var Facebook = require('./lib/facebook-node-sdk/facebook');
var Kucoo = require('./lib/user/user');

var express = require('express');
var MongoStore = require('connect-mongo')(express);

var app = express.createServer();

const config = { appId: '421587914546069', secret: '2c60320c813d7c47a1f32a4bf4e272c6' }

app.configure(function () {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.logger());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({ cookie: {  path: '/', maxAge: 60000000 * 5 }, 
                            secret: 'newyear20130101', 
                            store: new MongoStore({host : 'localhost', port : 27017, db : 'kucoo'})
                          }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
  app.use(Facebook.middleware({ appId: '421587914546069', secret: '2c60320c813d7c47a1f32a4bf4e272c6' }));
});


app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});


app.get('/minh', function (req, res) {
  res.render('index', { title: 'Express' })
});


app.get('/login', Facebook.loginRequired(), function (req, res) {
  req.facebook.api('/me', function(err, user) {
    req.session.user = user;
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end(JSON.stringify(user));
  });
});


app.post('/login', Facebook.loginRequired(), function (req, res) {
  req.facebook.api('/me', function(err, user) {
    req.session.user = user;
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end(JSON.stringify(user));
  });
});


app.get('/logout', function (req, res) {
  if (req.facebook != null)  {
     console.log("clear req.facebook!");
     req.facebook = null;
  }
  
  if (req.session.user != null) {
     console.log("Clear req.session.user!");
     req.session.user = null;
  }
 
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Logout!');
});



app.post('/logout', function (req, res) {
  if (req.facebook != null)  {
     console.log("clear req.facebook!");
     req.facebook = null;
  }

  if (req.session.user != null) {
     console.log("Clear req.session.user!");
     req.session.user = null;
  }

  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Logout!');
});



///////////////////////////FB Canvas/////////////////////////////////////

var film_question_page = function (req, res) {
            console.log(req.session.kuser.uid);
            qgen_client.getRandomQuestions(1, null, function(err, qList) {
              if (err) {
                 console.error(err);
              } else {
                 //console.log("client retrieved:", qList);
                 //res.send(qList);
                 //console.log(qList);
                 var q = qList[0];
                 console.log(q);
                 res.render('question', { category: 'Film',
                                          type: 'Sometype',
                                          question: q.question,
                                          answer0: q.answers[0],
                                          answer1: q.answers[1],
                                          answer2: q.answers[2],
                                          answer3: q.answers[3],
                                          answer: q.correctAnswer });
              }
            });
};


app.post('/canvas/', Facebook.canvasLoginRequired(config), function (req, res) {
    //res.send("user id is : " + req.session.kuser.uid);
    //res.render('index', { title: 'Kucoo' });
    /* 
    res.writeHead(200, {'Content-Type': 'text/html'});
    var content = '<ul>' +
                  '<li>Movies</li>' +
                  '<li>Musics</li>' +
                  '<li>History</li>' +
                  '</ul>';
    res.end(content);
    */
    film_question_page(req, res);
});


/////////////////////////Film API/////////////////////////////
app.post('/canvas/film/popular', Facebook.canvasLoginRequired(config), function (req, res) {
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


app.post('/canvas/film/question', Facebook.canvasLoginRequired(config), function (req, res) {
       film_question_page(req, res);
});




/////////////////////////Test API/////////////////////////////

var questGen = function (req, res) {
      qgen_client.getRandomQuestions(1, null, function(err, qList) {
              if (err) {
                 console.error(err);
              } else {
                 var q = qList[0];
                 console.log(q);
                 res.render('question', {
                                          layout: 'layout',
                                          category: 'Film',
                                          type: 'Sometype',
                                          question: q.question,
                                          answer0: q.answers[0],
                                          answer1: q.answers[1],
                                          answer2: q.answers[2],
                                          answer3: q.answers[3],
                                          answer: q.correctAnswer });
              }
            }); }


app.post('/canvas/film/test1', questGen);

app.get('/canvas/film/test1', questGen);



app.get('/canvas/film/test2', function (req, res) {
    qgen_client.getPopularFilms("1", function(err, filmList) {
      if (err) {
        console.error(err);
      } else {
        console.log("client retrieved:", filmList);
        res.send(filmList);
      }
   });

});


/////////////////////////General API/////////////////////////////
app.post('/canvas/game/categories', function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    var content = '<ul>' +
                  '<li>Movies</li>' +
                  '<li>Musics</li>' +
                  '<li>History</li>' +
                  '</ul>';
    res.end(content);

});


app.get('/canvas/game/categories', function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    var content = '<ul>' +
                  '<li>Movies</li>' +
                  '<li>Musics</li>' +
                  '<li>History</li>' +
                  '</ul>';
    res.end(content);

});


http.createServer(app.handle.bind(app)).listen(8080);
 https.createServer({
   key: fs.readFileSync('./conf/privatekey.pem'),
   cert: fs.readFileSync('./conf/certificate.pem')
 }, app.handle.bind(app)).listen(443);





