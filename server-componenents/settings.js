function userSettingSockets(socket, Users){
  socket.on('send id', (clientData) => {
    socket.emit('sent id', true);
    const callID = Number(clientData.fbid);
    Users.findOne({ active: 1, fbid: callID }, (err, user) => {
      if (err) throw err;
      if (user) {
        socket.emit('sendback', user);
      } else {
        socket.emit('no user', { noUser: true, fbid: clientData.fbid, email: clientData.email });
      }
    });
  });

  socket.on('add user', (clientData) => {
    const callID = Number(clientData.fbid);
    const settingsArray = determineSettings(clientData);
    Users.insert({
      fbid: callID,
      email: clientData.email,
      atoken: clientData.atoken,
      atoken_exp: clientData.atoken_exp,
      active: 1,
      incRead: settingsArray[0],
      mark_read: settingsArray[1],
      oldNote: settingsArray[2],
      created: clientData.cTime,
      updated: clientData.cTime
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

  return socket;
}

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

exports.userSettingSockets = userSettingSockets;
