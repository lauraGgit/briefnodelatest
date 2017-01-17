

var mongojs = require('mongojs');
var https = require('https');
var nodemailer = require('nodemailer');
var inc = require('./node_modules/inc');

var optionsget = inc.graphOptionsGet;

var data = '';
// do the GET request

var db = mongojs(inc.connection_string, ['ulist']);
var ulist = db.collection('ulist');
// similar syntax as the Mongo command-line interface
db.ulist.find({atoken_exp:{$lt:4000000}}).forEach(function(err, doc) {
  if (err) throw err;
  if (doc) { console.dir(doc);
  
   optionsget.path = '/oauth/access_token?client_id=282611145100368&client_secret=5d0725b525d5e9ef480f3b4937e0017a&grant_type=fb_exchange_token&fb_exchange_token='+ doc.atoken;
  //console.log(optionsget);
  var data = '';
// do the GET request
var reqGet = https.request(optionsget, function(res) {
    console.log("statusCode: ", res.statusCode);
    res.on('data', function(d) {
        data += d;
    });
    res.on('end', function(d) {
        var dparsed = JSON.parse(data);
        console.log(data);
      });
 
});
 
reqGet.end();
reqGet.on('error', function(e) {
    console.error(e);
}); //end of the facebook connection
  }
  db.close();
});  // end of db connection

//helper functions


