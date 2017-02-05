function adminSocketFunctions(socket, Users){
  socket.on('send admin', function (data) {
    const callID = Number(data.fbid);
    Users.findOne({active:1, fbid: callID }, function(err, user) {
      if (err) throw err;
      if (user) {
        if (user.priv.admin == 1){
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
      let toggleActive = 1
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

  socket.on('admin-page-called', function(data){ console.log('recieved admin page');});
  return socket;
}

exports.adminSocketFunctions = adminSocketFunctions;
