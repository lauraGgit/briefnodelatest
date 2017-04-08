require('dotenv').config({silent: true});
const express = require('express');
const mongojs = require('mongojs');

const mailBrief = require('./mailing/mail.js');
const db = mongojs(inc.connection_string, ['ulist']);
const Users = db.collection('ulist');

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
