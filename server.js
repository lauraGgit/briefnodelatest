'use strict';
require('dotenv').config({silent: true});
const express = require('express');
const mongojs = require('mongojs');
const request = require('superagent');
const cron = require('node-schedule');
const app = express();

const inc = require('./utils/dbConfig');
const fbConnection = require('./utils/fbConnection');
const mailBrief = require('./mailing/mail.js');


const admin = require('./server-componenents/admin');
const userSettings = require('./server-componenents/settings');

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
const pages = ['page', 'faq', 'renew', 'new-user-trade', 'admin'];
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

  userSettings.userSettingSockets(socket, Users);
  admin.adminSocketFunctions(socket, Users);
}); // close socket

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
