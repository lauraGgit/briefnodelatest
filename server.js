'use strict';
require('dotenv').config({silent: true});
const express = require('express');
const mongojs = require('mongojs');
const inc = require('./utils/dbConfig');
const fbConnection = require('./utils/fbConnection');
const request = require('superagent');
const mailBrief = require('./mailing/mail.js');
const cron = require('node-schedule');

const app = express();
const ipaddr = process.env.OPENSHIFT_NODEJS_IP;
const port = parseInt(process.env.OPENSHIFT_NODEJS_PORT) || 8080;
if (typeof ipaddr === 'undefined') {
  console.warn('No OPENSHIFT_NODEJS_IP environment variable');
}

const io = require('socket.io', { rememberTransport: false,
                                  transports: ['WebSocket', 'Flash Socket', 'AJAX long-polling']
                                 })
                                 .listen(app.listen(port, ipaddr));

const clientID = process.env.FB_CLIENT_ID;
const clientSecret = process.env.FB_CLIENT_SECRET;
const clientCredentialString = `client_id=${clientID}&client_secret=${clientSecret}`;

const db = mongojs(inc.connection_string, ['ulist']);
const Users = db.collection('ulist');

cron.scheduleJob('0 8 * * *', () => {
  Users.find({ active: 1 }).forEach(
    (err, user) => {
      if (err) console.log('throwing err');
      if (err) throw (err);
      if (user) {
        const validToken = mailBrief.isNotExpired(user);
        if (validToken) {
          mailBrief.buildNotificationEmail(user);
        } else {
          mailBrief.sendRenewalEmail(user);
        }
      }
    });
});


app.set('views', `${__dirname}/tpl`);
app.set('view engine', 'pug');
app.engine('pug', require('pug').__express);
app.use(express.static(`${__dirname}/public`));
const pages = ['page', 'faq', 'extend', 'new-user-trade', 'admin'];
pages.forEach((page) => {
  console.log(page);
  let url = `/${page}`;
  if (page === 'page') {
    url = '/';
  }
  app.get(url, resGetHandler(page));
});

function resGetHandler(p) {
  return function (req, res) {
     // copy body of handler function here
    res.render(p);
  };
}

app.get('/server-get', (req, res) => {
 // input value from search
  const tradeToken = req.query.token;
  const fbID = parseInt(req.query.fbid, 10);
  const url = `https://graph.facebook.com/oauth/access_token?${clientCredentialString}&grant_type=fb_exchange_token&fb_exchange_token=${tradeToken}`;
  request
  .get(url)
  .end(function(err, resp){
    const data = parseExtend(resp.text);
    // logic used to compare search results with the input from user
    const nowTime = Math.round(new Date().getTime() / 1000.0);
    const combTime = Number(data.expires) + nowTime;
    Users.update({ fbid: fbID }, { $set: { 'atokens.perm': { tok: data.access_token, exp: combTime, date_updated: nowTime } } },
          () => {
            res.send('Token Updated');
          }
        );
  });
});

io.sockets.on('connection', (socket) => {
  socket.emit('message', { message: 'Socket Connected' });

  socket.on('send id', (data) => {
    socket.emit('sent id', true);
    const callID = Number(data.fbid);
    Users.findOne({ active: 1, fbid: callID }, (err, user) => {
      if (err) throw err;
      if (user) {
        socket.emit('sendback', user);
      } else {
        socket.emit('no user', { noUser: true, fbid: data.fbid, email: data.email });
      }
    });
  });

  socket.on('add user', (data) => {
    const callID = Number(data.fbid);
    const settingsArray = determineSettings(data);
    Users.insert({
      fbid: callID,
      email: data.email,
      incRead: settingsArray[0],
      atoken: data.atoken,
      atoken_exp: data.atoken_exp,
      active: 1,
      mark_read: settingsArray[1],
      oldNote: settingsArray[2],
      created: data.cTime,
      updated: data.cTime
     },
     socket.emit('user added', 'Successful User Added')
   );
  }); // End Add User

  socket.on('save changes', (data) => {
    const callID = Number(data.fbid);
    const settingsArray = determineSettings(data);
    Users.update({ fbid: callID },
      { $set: {
        email: data.email,
        incRead: settingsArray[0],
        updated: data.cTime,
        mark_read: settingsArray[1],
        oldNote: settingsArray[2] }
      },
      socket.emit('sucess changes', `updated profile: ${settingsArray[1]}`)
    );
  });

  socket.on('unsubscribe', (data) => {
    const callID = Number(data.fbid);
    Users.update({ fbid: callID },
      { $set: {
        active: 0,
        updated: data.cTime }
    },
    socket.emit('unsubscribe complete', 'unsubscribed'));
  });

  socket.on('extend token', (data) => {
    const callID = Number(data.fbid);
    Users.update({ fbid: callID },
       { $set: {
         'atokens.extend':
          { tok: data.token,
            exp: data.exp }
           }
        });
  });

  socket.on('new perm-server token', (data) => {
    const extendURL = `${fbConnection.host}${fbConnection.version}/oauth/access_token?${clientCredentialString}&grant_type=fb_exchange_token&fb_exchange_token=${data.tok}`;
    promiseRequest(extendURL).then(
      (fbData) => {
        const nowTime = Math.round(new Date().getTime() / 1000.0);
        const a = parseExtend(fbData);
        const combTime = Number(a.expires) + nowTime;
        Users.update(
          { fbid: callID },
          { $set: { 'atokens.perm.tok': a.access_token, 'atokens.perm.exp': combTime, updated: nowTime, server: 1 } },
          socket.emit('perm-server token updated', { fb: callID, number: a.access_token, exp: a.expires }));
      })
    .catch((error) => { console.log(error); });
  });

  socket.on('new perm-client token', (data) => {
    const callID = Number(data.fbid);
    Users.update({ fbid: callID },
      { $set:
        {
          'atokens.perm.tok': data.token,
          'atokens.perm.exp': data.exp,
           updated: data.cTime
         }
       },
       socket.emit('perm-client token updated', { fb: callID, number: data.token, exp: data.exp }));
  });

  //Admin Functions
  socket.on('send admin', function (data) {
    const callID = Number(data.fbid);
    Users.findOne({active:1, fbid: callID }, function(err, user) {
      if (err) throw err;
      if (user) {
        if (user.priv.admin == 1){
          console.log('is admin');
          Users.find().sort({"updated": -1}).limit(20).toArray(function(err, allUsers){
            callBackAdmin('admin return', allUsers);
          });
        } else {
          socket.emit('not admin', {noUser:true, times: i, fbid: data.fbid, email: data.email });
        }
      } else {
        socket.emit('no user', true);
      }
    });
  });//end admin send

  socket.on('admin more',function(data){
    Users.find().sort({"updated": -1}).limit(20).skip(data).toArray(function(err,allUsers){
      callBackAdmin('admin more-user', allUsers);
    });
  });

  socket.on('admin refresh',function(data){
    Users.find().sort({"updated": -1}).limit(20).toArray(function(err, allUsers){
      callBackAdmin('admin refresh return', allUsers);
    });
  });

  function callBackAdmin(socketCommandString, users){
    if(users.length > 0){
      users.forEach(user => {
        delete user.atoken;
        delete user.atoken_exp;
      });
      socket.emit(socketCommandString, users);
    }
  }

  socket.on('admin update active', function(data){
    if (data){
      const toggleActive = 1
      if (data.currState == 1){
          toggleActive = 0;
      }
      Users.update({fbid: data.fbid}, {$set:{active: toggleActive}},
        socket.emit('admin active',{fbid: data.fbid, active: toggleActive}
      ));
    } else {
      socket.emit('sock error', true);
    }
  });

  socket.on('admin delete', function(user){
    if (data){
      Users.remove({fbid: user.fbid}, 1);
    } else {
      socket.emit('sock error', true);
    }
  });

  socket.on('admin-page-called', function(data){ console.log('recieved admin page');})
}); // close socket

/**
 * A promise function to send a superagent request.
 * @param {string} url - Where to send the get request.
 */
function promiseRequest(url) {
  return new Promise((resolve, reject) => {
    request
    .get(url)
    .end((err, res) => {
      if (err) reject(err);
      if (res) resolve(res);
    });
  });
}

// Extend CallBack Function
// function extendCallBack(response) {
//   let str = '';
//
//   // another chunk of data has been recieved, so append it to `str`
//   response.on('data', (data) => {
//     str += data;
//   });
//
//   // the whole response has been recieved, so we just print it out here
//   response.on('end', () => {
//     const nowTime = Math.round(new Date().getTime() / 1000.0);
//     const a = parseExtend(fbData);
//     const combTime = Number(a.expires) + nowTime;
//     Users.update({ fbid: callID }, { $set: { 'atokens.perm.tok': a.access_token, 'atokens.perm.exp': combTime, updated: nowTime, server: 1 } }, socket.emit('perm-server token updated', { fb: callID, number: a.access_token, exp: a.expires }));
//   });
// }

function determineSettings(data) {
  let readStatus = 1;
  if (data.read !== null) {
    readStatus = data.read;
  }
  let mark = 1;
  if (data.mark !== null) {
    mark = data.mark;
  }
  let olds = 1;
  if (data.oldNote !== null) {
    olds = data.oldNote;
  }
  return [readStatus, mark, olds];
}

function parseExtend(resp) {
  if (resp[0] == 'a') {
    const splittings = resp.split('&');
    const access = {};
    splittings.forEach((splitting) => {
      const tokenKeyValue = splitting.split('=');
      access[tokenKeyValue[0]] = tokenKeyValue[1];
    });
    return access;
  } else {
    return 'error';
  }
}
