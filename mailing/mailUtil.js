'use strict';

const nodemailer = require('nodemailer');
const smtpConfig = {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // use SSL
    auth: {
        user: process.env.MAILING_USER,
        pass: process.env.MAILING_PASSWORD
    }
};

module.exports = {
  sendMail: function (bodyText, subject , toEmailAddress, fromAddress) {
    let sender = process.env.MAILING_EMAIL
    if (fromAddress){
      sender = fromAddress;
    }
    const transport = nodemailer.createTransport(smtpConfig);
    // Message object
    const message = {
        from: sender,
        to: toEmailAddress,
        subject: subject, //
        headers: {
            'X-Laziness-level': 1000
        },
        text: bodyText,
        html: bodyText
    };

    console.log('Sending Mail');
    transport.sendMail(message, function(error, info){
        if(error){
            console.log('Error: sending email to '+toEmailAddress);
            console.log(error.message);
            return;
        }
        console.log('Message to '+toEmailAddress+' sent successfully' +info.response);
        // if you don't want to use this transport object anymore, uncomment following line
        transport.close(); // close the connection pool
    });
  }
};
