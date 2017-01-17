

var mongojs = require('mongojs');
var https = require('https');
var nodemailer = require('nodemailer');
var inc = require('./node_modules/inc');

//var optionsget = inc.graphOptionsGet;

var data = '';
// do the GET request

var db = mongojs(inc.connection_string, ['ulist']);
var ulist = db.collection('ulist');
var analytics = db.collection('analytics');
var d = new Date();
// similar syntax as the Mongo command-line interface
statObj = {users: 0};

db.analytics.save({date: d, users: 2});
// db.ulist.find({active:1}).forEach(function(err, doc) {
// 	if(doc){
// 	statObj.users += 1;
// 	}
// 	//console.log('Total Active Users:' + stats.users);
	

// //db.analytics.save({date:d}, {active_users: statObj.users});
// db.close(function(){
// 		console.log('Tot'+statObj.users);
// 	});
//});  // end of db connection


