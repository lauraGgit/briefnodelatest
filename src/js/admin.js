var scaffold = require('./frontendScaffold');

scaffold.frontendScaffold(true,
  document,
  adminUserVerification,
  additionalPageFunctions
);

function adminUserVerification(facebookInfo, socket){
  console.log('Verifying Admin');
  return socket.emit('send admin', {fbid: facebookInfo.userID}, function(){
    console.log('Sent User Id for privilege Verification');
  });
}

function additionalPageFunctions(socket){
  socket.on('admin return', function (data) {
    console.log('admin recieved');
    if(data) {
      console.log(data);
      $('#loading').fadeOut();
      $('#settings').fadeIn();
      buildTable(data, $('#users'), function(socket){
        $('.active-btn').click(function(e){
          e.preventDefault();
          var send = {"fbid": parseInt($(this).parents("tr").attr("id"),10),
                      currState: parseInt($(this).attr("id"),10)};
          socket.emit('admin update active', send);
        });

        $('.delete-btn').click(function(e){
          e.preventDefault();
          var id = parseInt($(this).parents("tr").attr("id"),10);
          socket.emit('admin delete', {"fbid": id});
          $('#'+id).remove();
        });
      });
    } // End Table Build
    else {
      console.log("There is a problem:");
    }
  });

  socket.on('not admin', function (data) {
      if(data) {
        alert("not admin");
        $('#settings').remove();
        $('#loading').fadeOut();
      } else {
          console.log("There is a problem:");
      }
  });

  socket.on('admin active', function(data){
      if (data){
        if(data.active == 1){
          $('#'+data.fbid+ " .aCell")
            .addClass("success")
            .removeClass("danger");
          $('#'+data.fbid + " .active-btn")
            .text("On")
            .attr("id", 1);
        } else {
          $('#'+data.fbid+ " .aCell")
            .addClass("danger")
            .removeClass("success");
          $('#'+data.fbid + " .active-btn")
            .text("Off")
            .attr("id", 0);
        }
      }
    });

    socket.on('admin more-user',function(data) {
        if(data){
          buildTable( data, $('#users') );
        }
      });

    socket.on('admin refresh return',function(data) {
      if(data) {
        $('#users td').remove();
        buildTable(data,$('#users'), socket);
      }
    });

    //Infinite Pagnination
    skipNum = 20;
    $('#more-users').click(function(e){
      e.preventDefault();
      socket.emit('admin more', skipNum);
      skipNum += 20;
    });

    $('#refresh').click(function(e){
      e.preventDefault();
      socket.emit('admin refresh', true);
    });

  return socket;
}

function readIO(v){
  if (v == 'read'){
    return 1;
  } else {
    return 0;
  }
}

function getURLQueryStr(param) {
  var val = document.URL;
  var url = val.substr(val.indexOf(param));
  var n=url.replace(param+"=","");
  return n;
}

//Work on this funciotn
function dateFormat(d){
  d = d*1000;
  var time = new Date(d);
  return time.toDateString();
}

function buildTable(UserArray, $table, callback){
          for (user = 0; user < UserArray.length; user++){
            buildRow(UserArray[user],$table);
          }//End Row Loop
    callback();
}

function buildRow(obj, $table){
          $row = $('<tr />');
            for(var key in obj){
              var cClass = "";
              var val = obj[key];
              switch(key){
                case 'fbid':
                  $row.attr("id", val);
                  break;
                case '_id':
                case 'priv':
                  break;
                case 'created':
                case 'updated':
                  $row.append($('<td />')
                    .text(dateFormat(val)));
                  break;
                case 'atokens':
                  $row.append($('<td />')
                    .text(dateFormat(val.perm.exp)));
                  break;
                case 'active':
                  if(val == 1){
                    cClass = "success";
                    button = "On";
                  } else {
                    cClass = "danger";
                    button = "Off";
                  }
                   $row.append($('<td />')
                    .addClass(cClass +" aCell")
                    .append($('<button />')
                    .addClass('btn btn-primary btn-xs active-btn')
                    .attr("id", val)
                    .text(button)));
                    break;
                case 'incRead':
                case 'mark_read':
                case 'oldNote':
                  if(val == 1){
                    cClass = "success";
                  } else {
                    cClass = "danger";
                  }
                   $row.append($('<td />')
                    .addClass(cClass+" table-bordered")
                    .text(" "));
                  break;
                default:
                  $row.append($('<td />')
                    .text(val));
              }//End Switch
            }//End Cell loop
            $row.append($('<td />')
              .append($('<button />')
              .addClass('btn btn-primary btn-xs delete-btn')
              .text("Delete")));
            $table.append($row);
}
