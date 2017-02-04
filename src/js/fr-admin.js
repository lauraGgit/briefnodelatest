var socket = io.connect();
var socketConnected = false;

socket.on('message', function(data){
  socketConnected = true;
});

window.fbAsyncInit = function() {
  FB.init({
    appId      : '282611145100368',
    xfbml      : true,
    version    : 'v2.3'
  });
  FB.AppEvents.logPageView();

  $(document).ready(function(){
    socket.emit('admin-page-called', 'text');
    $.validate();
    var $settingForm = $('#setForm');
    var $fbAuth = $('#auth');
    var $alert = $('#notification');
    var $unSub = $('#unsubscribe');
    var $settings = $('#settings');

    checkFacebookLoginState(); // 1st Check Login State

    function checkFacebookLoginState() {
      console.log("Getting User Facebook Login State");
      FB.getLoginStatus(function(response) {
        loginStatusCallback(response);
      });
    }

    function loginStatusCallback(response){
      console.log("fb Subscribe Callback Init");
      // Here we specify what we do with the response anytime this event occurs.
      if (response.status === 'connected') {
        successfullLoginCallback(response.authResponse.accessToken, response.authResponse.expiresIn);
      } else if (response.status === 'not_authorized') {
        console.log("App Not Authorized");
        alertNote($alert, 'warning', 'Please allow Brief access to Facebook.');
      } else {
        console.log("Not Logged in");
        alertNote($alert, 'warning', 'Please login to allow Brief access to Facebook.');
      }
    }// end subScribeCallback

    //Add button login functionality
    //TODO add to global functionality
    $fbAuth.click(function(e){
      e.preventDefault();
      FB.login(function(response){
        successfullLoginCallback(response.authResponse.accessToken, response.authResponse.expiresIn, true);
        },
        {scope: 'email,user_likes,manage_notifications'});
      });

    // Here we run a very simple test of the Graph API after login is successful.
    function successfullLoginCallback(token, expire) {
      console.log("User logged into Facebook successfully.");

      //Update UI
      $fbAuth.fadeOut("slow");
      $('#loading').fadeIn("slow");
      $('#welcome').fadeOut();

      FB.api('/me', function(response) {
        const userID = response.id;
        if(socketConnected){
          socket.emit('send admin', {fbid: userID}, function(){
            console.log('Sent User Id for privilege Verification');
          });
        } else {
          console.log('Socket Not Yet loaded');
        }
      }); //End Fb Response
    } //End Success Callback

      socket.on('admin return', function (data) {
        console.log('admin recieved');
        if(data) {
          console.log(data);
          $('#loading').fadeOut();
          $('#settings').fadeIn();
          buildTable(data, $('#users'));
        }// End Table Build
        else {
          console.log("There is a problem:");
        }
      }); //End Admin Return

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
            buildTable(data,$('#users'));
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

        function alertNote($alertDiv, alertClass, text){
          $alertDiv.stop().removeClass("alert-warning alert-success alert-danger alert-info").addClass('alert-'+alertClass).html(text).fadeIn(300).delay(1200).fadeOut(300);
        }
  });
};

(function(d, s, id){
   var js, fjs = d.getElementsByTagName(s)[0];
   if (d.getElementById(id)) {return;}
   js = d.createElement(s); js.id = id;
   js.src = "//connect.facebook.net/en_US/sdk.js";
   fjs.parentNode.insertBefore(js, fjs);
 }(document, 'script', 'facebook-jssdk'));

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

function buildTable(UserArray, $table){
          for (user = 0; user < UserArray.length; user++){
            buildRow(UserArray[user],$table);
          }//End Row Loop
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
}

function buildRow(obj, $table){
          $row = $('<tr />');
            for(var key in obj){
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
                    .text(dateFormat(val['perm']['exp'])));
                  break;
                case 'active':
                  var cClass = "";
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
                  var cClass = "";
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
