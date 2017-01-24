require('dotenv').config({silent: true});
const mongojs = require('mongojs');
const request = require('superagent');
const fbConnection = require('../utils/fbConnection');
const mailUtil = require('./mailUtil');
const dateUtil = require('../utils/dateUtils');
const dbConfig = require('../utils/dbConfig');

const db = mongojs(dbConfig.connection_string, ['ulist']);
const Users = db.collection('ulist');

Users.find({ active: 1 }).forEach(
  (err, user) => {
    if (err) throw (err);
    if (user) {
      const validToken = isNotExpired(user);
      if (validToken) {
        buildNotificationEmail(user);
      } else {
        sendRenewalEmail(user);
      }
    }
  });

db.close();

/**
 * Run function to grab the facebook request information and then builds an email.
 * @param {object} user - An object of a user's details and settings.
 */
function buildNotificationEmail(user) {
  const reqParams = prepFacebookRequest(user);
  const requestUrl = `${fbConnection.host + fbConnection.version + user.fbid}/notifications?${reqParams.qstring}access_token=${reqParams.tok}`;
  promiseRequest(requestUrl).then(
    (fbData) => {
      const facebookNotifications = JSON.parse(fbData.text);
      const emailText = makeEmailText(facebookNotifications, user.incRead, user.oldNote);
      mailUtil.sendMail(emailText, 'Brief - Your Daily Facebook Email', user.email);
      if (user.mark_read === 1) {
        markRead(facebookNotifications, reqParams.tok);
      }
    })
  .catch((error) => { console.log(error); });
}

/** Checks if the Facebook token for a particular user is not expired.
 * @param {object} user - An object of a user's details and settings.
 */
function isNotExpired(user) {
  const now = Math.round(new Date().getTime() / 1000.0);
  if (user.atokens.perm.exp > now) {
    return true;
  }
  return false;
}

/** Builds params for the request to facebook based on the user settings.
 * @param {object} user - An object of a user's details and settings.
 */
function prepFacebookRequest(user) {
  let qstring = '';
  if (user.incRead === 1) {
    qstring = 'include_read=1&';
  }
  let tok = user.atoken;
  if (user.atokens && user.atokens.perm.tok) {
    tok = user.atokens.perm.tok;
  }
  return { qstring, tok };
}

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

/**
 * Builds the email text and sends an email to the user suggesting
 * that they renew their Brief subscription.
 * @param {object} user - An object of a user's details and settings.
 */
function sendRenewalEmail(user) {
  const renewalEmailText = "Your Facebook Connection has Expired. Please go log back into \
                            <a href='http://www.brief-fb.me/extend'>Brief</a> to update your credentials.\
                            <br /> And don't worry, this is natural. Facebook requires that you log back in \
                             about every 60 days to make sure you still need access.";
  mailUtil.sendMail(renewalEmailText, 'Brief - Your Daily Facebook Email >> ACTION NEEDED', user.email);
}

/**
 * Builds the HTML for an email.
 * @param {object} notification - An object of a user's notifications from Facebook.
 * @param {string} sectionHeader - The title of the email to be displayed in the email.
 * @param {integer} displayOld - Whether the user has decided to display fb notifications
 * older than a day.
 */
function makeEmailText(notifications, includePreviouslyReadNotifications, displayOld) {
  let msg = '';
  if ('error' in notifications) {
    console.log('error in notifications retriveal');
    msg = 'Facebook was unable to connect to your profile.';
  } else {
    msg += makeEmailSection(notifications.data, 'Unread', displayOld);
    if (includePreviouslyReadNotifications === 1) {
      msg += makeEmailSection(notifications.data, 'Read', displayOld);
    }
  }
  return msg;
}

/**
 * Builds the HTML for a section of the email.
 * @param {object} notification - An object for a notification from Facebook.
 * @param {string} sectionHeader - The title of the email to be displayed in the email.
 * @param {integer} displayOldNotifications - Whether the user has decided to display fb
 * notifications older than a day.
 */
function makeEmailSection(notifications, sectionHeader, displayOldNotifications) {
  const emailMiniHeaders = {};
  const fbGroups = {};
  const emailSectionHeader = `<h1 style="font-size: 26px;font-family:lucida grande, tahoma, verdana, arial, sans-serif;padding: 5px;">${sectionHeader}</h1>`;
  notifications.forEach((notification) => {
    const notificationInfo = compileNotificationText(notification,
                              displayOldNotifications,
                              sectionHeader);
    if (notificationInfo) {
      if (notificationInfo.appClass === 'groups') {
        if (notificationInfo.group[0] in fbGroups) {
          fbGroups[notificationInfo.group[0]].content.push(notificationInfo.notification);
        } else {
          fbGroups[notificationInfo.group[0]] = { title: notificationInfo.group[1],
            content: [notificationInfo.notification] };
        }
      } else if (notificationInfo.appClass in emailMiniHeaders) {
        emailMiniHeaders[notificationInfo.appClass].push(notificationInfo.notification);
      } else {
        emailMiniHeaders[notificationInfo.appClass] = [notificationInfo.notification];
      }
    }
  });
  emailMiniHeaders.groups = addGroups(fbGroups);
  const emailSectionBody = combineEmailMiniHeaders(emailMiniHeaders, appsObject);
  return emailSectionHeader + emailSectionBody;
}

/**
* Compiles notification into email text.
* @param {object} notification - An object for a notification from Facebook.
* @param {string} sectionHeader - The title of the email to be displayed in
* the email.
* @param {integer} displayOldNotifications - Whether the user has decided
* to display fb notifications older than a day.
*/
function compileNotificationText(notification, displayOldNotifications, sectionHeader) {
  const displayInEmail = decideToDisplay(notification, displayOldNotifications, sectionHeader);
  if (displayInEmail) {
    const backgroundColor = (sectionHeader === 'Unread') ? '#edeff4' : '#ffffff';
    const name = notification.from.name;
    const truncatedTitle = notification.title.substring(name.length);
    let appType;
    if (typeof notification.application === 'undefined') {
      appType = whichAppType('Other');
    } else {
      appType = whichAppType(notification.application.name);
    }
    let noteText = `<div style="border-bottom:1px solid #ddd;background-color:${backgroundColor};"> \
                      <p style="color:#444; font-family:lucida grande, tahoma, verdana, arial, sans-serif;padding:5px"> \
                      <a style="color:#3b5998;font-weight:bold;text-decoration:none;" href="http://www.facebook.com/${notification.from.id}">${name}</a>`;

    if (notification.object.message) {
      const noRepeatTitle = elminateRepeatedTitleText(truncatedTitle);
      noteText += `<a style="color:#444;text-decoration:none" href="${notification.link}"> ${noRepeatTitle}</a>`;
      noteText += `<div style="margin: 2px">${notification.object.message}</div>`;
    } else {
      noteText += `<a style="color:#444;text-decoration:none" href="${notification.link}"> ${truncatedTitle}</a>`;
    }
    noteText += '</div>';
    let includeInGroup;
    if (appType === 'groups') {
      const groupInfo = decideGroupSubHeader(notification, truncatedTitle);
      includeInGroup = groupInfo;
    } else {
      includeInGroup = false;
    }
    return { notification: noteText, group: includeInGroup, appClass: appType };
  }
  return false;
}

/**
 * Shortens a title of a notification if there is a colon present.
 * @param {string} titleString - the string of the notification to be shortened
 * @return ether the original string until the colon or the full string if no colon is present
 */
function elminateRepeatedTitleText(titleString) {
  const colonIndex = titleString.indexOf(':');
  if (colonIndex !== -1) {
    return titleString.substring(0, colonIndex);
  }
  return titleString;
}


/**
 * Chooses if a particular notification should be added this particular section
 * of the email.
 * @param {object} notification - An object for a notification from Facebook.
 * @param {integer} displayOldNotifications - Whether the user has decided to display
 * fb notifications older than a day.
 */
function decideToDisplay(notification, displayOldNotifications, sectionHeader) {
  let display = false;
  if (sectionHeader === 'Unread' && notification.unread === 1) {
    display = shouldDisplayOld(displayOldNotifications, notification.updated_time);
  } else {  // handle previously section
    if (notification.unread === 0 && sectionHeader !== 'Unread') {
      display = shouldDisplayOld(displayOldNotifications, notification.updated_time);
    }
  }
  return display;
}

/**
 * Decide if a particular date is young enough to display based on settings.
 * @param {object} notification - An object for a notification from Facebook.
 * @param {integer} displayOldNotifications - Whether the user has decided to
 * display fb notifications older than a day.
 */
function shouldDisplayOld(displayOldNotifications, updatedTime) {
  if (displayOldNotifications === 1) {
    return true;
  }
  return dateUtil.findMoreRecent(notification.updated_time);
}


/**
 * If the notification came from a group post Parses a notification's group
 * to link posts from that group together.
 * @param {object} notification - An object for a notification from Facebook.
 * @returns An array of the group and its name;
 */
function decideGroupSubHeader(notification, truncatedTitle) {
  const notificationLink = notification.link.split('http://www.facebook.com/groups/');
  let group = 'unknown';
  let groupName = 'Unknown';
  if (notificationLink[1] !== undefined) {
    const groupParse = notificationLink[1].split('/');
    group = groupParse[0];
    groupName = parseGroupTitle(truncatedTitle);
  }
  return [group, groupName];
}

/**
 * Takes a notification string and then parses it to be just the name of the group.
 * @param {object} notification - An object for a notification from Facebook.
 * @returns An array of the group and its name;
 */
function parseGroupTitle(notificationTitle) {
  const colon = notificationTitle.indexOf(':');
  let end = '';
  if (colon === -1) {
    end = notificationTitle.length - 1;
  } else {
    end = colon;
  }
  return notificationTitle.substring(notificationTitle.indexOf('posted in ') + 'posted in '.length, end);
}

const appsObject = {
  groups: {
    name: 'Groups',
    icon: 'https://fbstatic-a.akamaihd.net/rsrc.php/v2/yI/r/0pjqWL1NfkE.png',
  },
  events: {
    name: 'Events',
    icon: 'https://fbstatic-a.akamaihd.net/rsrc.php/v2/yC/r/VoafzBvncKN.png',
  },
  likes: {
    name: 'Likes, Comments, and Posts',
    icon: 'https://fbstatic-a.akamaihd.net/rsrc.php/v2/yf/r/0HZPW6-lhQu.png',
  },
  other: {
    name: 'Other',
    icon: 'https://fbstatic-a.akamaihd.net/rsrc.php/v2/yN/r/xC785tTCIQO.gif',
  },
};

/**
 * Combines an object of individual notification HTML snippets into a better HTML chunk.
 * @param {object} applicationObject - An object for of individual notification HTML snippets
 * @returns An object of the information for a notification
 */
function addGroups(groupObject) {
  const groupArray = [];
  for (const group in groupObject) {
    let groupText = '';
    groupText = `<h3 style="padding:3px;font-size: 16px;font-family:lucida grande, tahoma, verdana, arial, sans-serif">${groupObject[group].title}</h3>`;
    groupText += groupObject[group].content.join('');
    groupArray.push(groupText);
  }
  return groupArray;
}

/**
 * Combines an object of individual notification HTML snippets into a better HTML chunk.
 * @param {object} applicationObject - An object for of individual notification HTML snippets
 * @returns An object of the information for a notification
 */
function combineEmailMiniHeaders(applicationObject, appsObject) {
  let emailText = '';
  for (const header in applicationObject) {
    emailText += `<h2 style="padding:5px;font-size: 18px;font-family:lucida grande, tahoma, verdana, arial, sans-serif;" class="${header}"><img src="${appsObject[header].icon}" style="display:inline;padding-right: 5px;vertical-align: -2px;"/>${appsObject[header].name}</h2>`;
    emailText += applicationObject[header].join('');
  }
  return emailText;
}

/**
 * Chooses if what icon and group to add a notification to.
 * @param {string} app_name - Which application from within
 * facebook an particular notification came from.
 */
function whichAppType(appName) {
  let appClass;
  switch (appName) {
    case 'Groups':
      appClass = 'groups';
      break;
    case 'Events':
      appClass = 'events';
      break;
    case 'Wall':
    case 'Likes':
    case 'Links':
    case 'Feed Comments':
      appClass = 'likes';
      break;
    default:
      appClass = 'other';
  }
  return appClass;
}

/**
 * Calls facebook to mark a notification as read.
 * @param {object} notifications - An object of notifications for a particular user from Facebook.
 * @param {string} validToken - The user's long-term token to access facebook.
 */
function markRead(notifications, validToken) {
  notifications.data.forEach((notification) => {
    if (notification.unread === 1) {
      const url = `${fbConnection.host + fbConnection.version + notification.id}?unread=0&access_token=${validToken}`;
      request
        .post(url)
        .end((err, res) => {
          if (err || !res.ok) {
            console.log(err);
          } else {
            console.log(`Marked notification${notification.id}as read`);
          }
        });
    }
  });
}
