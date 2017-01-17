require('dotenv').config();
const pmongo = require('promised-mongo');
const request = require('superagent');
const fbConnection = require('../utils/fbConnection');
const mailUtil = require('./mailUtil');
const dateUtil = require('../utils/dateUtils');
const dbConfig = require('../utils/dbConfig');

const db = mongojs(dbConfig.connection_string, ['ulist']);
const Users = db.collection('ulist');

class AdminFunctions{
  constructor(socket, userCollection) {
    this.socket = socket;
    this.userCollection = userCollection
  }

  // Admin Functions
  socket.on('send admin', (data) => {
    const callID = Number(data.fbid);
    Users.findOne({ active: 1, fbid: callID }, (err, doc) => {
      if (err) throw err;
      if (doc) {
        if (doc.priv.admin === 1) {
          Users.find().sort({ updated: -1 })
          .limit(20)
          .toArray((err, docs) => {
            if (docs.length > 0) {
              docs.forEach((doc) => {
                delete doc.atoken;
                delete doc.atoken_exp;
              });
              socket.emit('admin return', docs);
            }
          });
        } else {
          socket.emit('not admin', { noUser: true, times: i, fbid: data.fbid, email: data.email });
        }
      } else {
        socket.emit('no user', true);
      }
    });
  });// end admin send

  socket.on('admin more', (data) => {
    Users.find().sort({ updated: -1 })
    .limit(20)
    .skip(data)
    .toArray((err, docs) => {
      if (docs.length > 0) {
        docs.forEach((doc) => {
          delete doc.atoken;
          delete doc.atoken_exp;
        });
        socket.emit('admin more-user', docs);
      }
    });
  });

  socket.on('admin refresh', (data) => {
    Users.find().sort({ updated: -1 })
    .limit(20)
    .toArray((err, docs) => {
    if (docs.length > 0) {
      docs.forEach((doc) => {
        delete doc.atoken;
        delete doc.atoken_exp;
      });
      socket.emit('admin refresh return', docs);
    }
    });
  });

  socket.on('admin update active', (data) => {
    if (data) {
      let aSwitch = 1;
      if (data.currState === 1) {
        aSwitch = 0;
      }
      Users.update({ fbid: data.fbid }, { $set: { active: aSwitch } }, socket.emit('admin active', { fbid: data.fbid, active: aSwitch }));
    } else {
      socket.emit('sock error', true);
    }
  });

  socket.on('admin delete', (data) => {
    if (data) {
      Users.remove({ fbid: data.fbid }, 1);
    } else {
      socket.emit('sock error', true);
    }
  });
}
