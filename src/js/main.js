var socket = io.connect();

$(document).ready(function() {

  $.validate();
  var logged = false;
  var $settingForm = $('#setForm');
  var $fbAuth = $('#auth');
  var $emailInp = $('#email');
  var $alert = $('#notification');
  var $unSub = $('#unsubscribe');
  var $settings = $('#settings');

  //Init Login Functions
  $fbAuth.click(function(e){
    e.preventDefault();
    FB.login(function(response){
      // console.log(resp);
      logged = true;
      successfullLoginCallback(response.authResponse.accessToken, response.authResponse.expiresIn, true);
      },
      {scope: 'email,user_likes,manage_notifications'});
    });
  if(!logged){ $fbAuth.show();}

  //Unsubscribe Event
  $unSub.click(function(e){
  		e.preventDefault();
      $alert.addClass("alert-danger").html('<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button><h4>Are you Sure!</h4><p>This will end all the awesome facebook emails you are recieving.</p><p><button type="button" id="unsubscribe-affirm" class="btn btn-danger">Yes, I want stop getting emails</button><button type="button" id="unsubscribe-cancel" class="btn btn-default">No, I still want to recieve emails</button></p>').fadeIn(300);
      $('#unsubscribe-affirm').click(function(e){
          nowTime = Math.round(new Date().getTime()/1000.0);
          socket.emit('unsubscribe', {fbid: id_send, cTime: nowTime});
          alertNote($alert, 'success', 'You are now unsubscribed from Brief, sorry to see you go.');
      });
  });

  socket.on('sent id', function(data){
    if(data){
      console.log("sent id fired");
    }
  });

  //Populate existing settings
  socket.on('sendback', function (data) {
    if(data) {
        console.log("Sendback Socket Response")
        $('#loading').fadeOut();
        $settings.slideDown("slow");

        $('#email').val(data.email);
        if (data.incRead == 1){
          $('input:radio[name=inRead]').filter('[value=1]').prop('checked',true);

        } else {
          $('input:radio[name=inRead]').filter('[value=0]').prop('checked',true);
        }
        if (data.mark_read == 1){
          $('input:radio[name=markRead]').filter('[value=1]').prop('checked',true);

        } else {
          $('input:radio[name=markRead]').filter('[value=0]').prop('checked',true);
        }
        if (data.oldNote == 1){
          $('input:radio[name=dayOld]').filter('[value=1]').prop('checked',true);

        } else {
          $('input:radio[name=dayOld]').filter('[value=0]').prop('checked',true);
        }
    } else {
        console.log("There is a problem:");
    }
  });

  //Confirm settings update listener
  socket.on('sucess changes', function (data) {
      if(data) {
        console.log(data);
        alertNote($alert, 'success', 'Your changes were sucessfully changed.');
      } else {
          console.log("There is a problem:");
      }
  });

  socket.on('user added',function(data){
    if(data){
      window.location.replace("/new-user-trade");
    }
  });

  // FB Login
  function statusChangeCallback(response){
    console.log(response);
  }

  function subScribeCallback(response, fromClick){
    console.log("fb Subscribe Callback Init");
    // Here we specify what we do with the response anytime this event occurs.
    if (response.status === 'connected') {
      logged = true;
      successfullLoginCallback(response.authResponse.accessToken, response.authResponse.expiresIn, fromClick);
    } else if (response.status === 'not_authorized') {
      console.log("subScribeCallback not Authorized");
      alertNote($alert, 'warning', 'Please authorize Brief.');
    } else {
      console.log("subScribeCallback other/ not logged in");
      alertNote($alert, 'warning', 'Please login to facebook authorize Brief.');
    }
  }// end subScribeCallback

  function checkLoginState() {
    console.log("checkLoginState");
    FB.getLoginStatus(function(response) {
      subScribeCallback(response, true);
    });
  }

  FB.Event.subscribe('auth.authResponseChange', function(response) {
    console.log("event subscribe from async");
    subScribeCallback(response, false);
  }); //end response

  // Here we run a very simple test of the Graph API after login is successful.
  // This testAPI() function is only called in those cases.
  function successfullLoginCallback(token, expire, fromClick) {
    console.log("SucessAPI called");

    //Call Loading Screen
    $fbAuth.fadeOut("slow");
    $('#loading').fadeIn("slow");
    $('#welcome').fadeOut();
    //console.log('Welcome!  Fetching your information.... ');
    FB.api('/me', function(response) {
      const id_send = response.id;
      console.log("FB.api response called");
      if(fromClick){
        console.log("fromClick trigger");
        socket.emit('send id', {fbid: id_send, preClick: true, email: response.email}, function (){
          console.log("send id sent");
        });
     } else {
      socket.on('message', function (data) {
        if(data.message) {
          socket.emit('send id', {fbid: id_send, preClick: false});
          console.log(data.message);
        } else {
          console.log("There is a problem:", data);
        }
      });
     }

      //Handle users not found in db
      var firstSend = true;
      socket.on('no user', function(data){
      if(data){
            //console.log("noUser Function Called");
            console.log(data);
            $('#loading').fadeOut();
            $settings.slideDown("slow");
            $settingForm.before($('<h3/>').addClass('newUser').text("Looks like you don't have an account. Fill out the form below to start recieving your Daily Facebook Digest"));
            $emailInp.val(response.email);
            $('input:radio[name=inRead]').filter('[value=1]').prop('checked',true);
            $('input:radio[name=dayOld]').filter('[value=1]').prop('checked',true);
            $('input:radio[name=markRead]').filter('[value=1]').prop('checked',true);
            $('#save-changes').text('Create an account');
            $settingForm.submit(function(e){
              e.preventDefault();
              $('.newUser').fadeOut();
              incR = parseInt($('input[name=inRead]:checked', '#setForm').val(),10);
              markR = parseInt($('input[name=markRead]:checked', '#setForm').val(),10);
              oldN = parseInt($('input[name=dayOld]:checked', '#setForm').val(), 10);
              nowTime = Math.round(new Date().getTime()/1000.0);
              socket.emit('add user', {fbid: response.id, email: $emailInp.val() , read: incR, atoken: token, atoken_exp: expire, mark: markR, oldNote: oldN, cTime: nowTime});
              alertNote($alert, 'warning', 'Please wait a moment while we create your account.');
              window.location.replace("/new-user-trade");

            });
            }
      });

      //Update Settings for an existing user
       $settingForm.submit(function(e){
          e.preventDefault();
          incR = parseInt($('input[name=inRead]:checked', '#setForm').val(), 10);
          markR = parseInt($('input[name=markRead]:checked', '#setForm').val(), 10);
          oldN = parseInt($('input[name=dayOld]:checked', '#setForm').val(), 10);
          nowTime = Math.round(new Date().getTime()/1000.0);
          socket.emit('save changes', {fbid: id_send, email: $emailInp.val() , read: incR, mark: markR, oldNote: oldN, cTime: nowTime});
          alertNote($alert, 'warning', 'Please wait a moment while your changes are saved.');
        });

    }); //End Fb Response
  } //End Success Callback

  // Helper Functions
  function alertNote($alertDiv, alertClass, text){
      $alertDiv.stop().removeClass("alert-warning alert-success alert-danger alert-info").addClass('alert-'+alertClass).html(text).fadeIn(300).delay(1200).fadeOut(300);
  }
});

function readIO(v){
  if (v == 'read'){
    return 1;
  }
  return 0;
}

function getURLQueryStr(param) {
  var val = document.URL;
  var url = val.substr(val.indexOf(param));
  var n=url.replace(param+"=","");
  return n;
}
