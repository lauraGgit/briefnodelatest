var scaffold = require('./frontendScaffold');

scaffold.frontendScaffold(true,
  document,
  userVerification,
  additionalPageFunctions
);

function userVerification(facebookInfo, socket){
  $.validate();
  var $settingForm = $('#setForm');
  var $emailInp = $('#email');
  var $alert = $('#notification');
  var $settings = $('#settings');

  console.log('Checking if existing user');
  socket.emit('send id', {fbid: facebookInfo.userID}, function(){
    console.log('Sent server user Facebook ID');
  });

  function addSubmitHandler(socketEmitString, alertText, socketCallback){
    $settingForm.submit(function(e){
      e.preventDefault();
      var includeRead = parseInt($('input[name=inRead]:checked', '#setForm').val(),10);
      var markRead = parseInt($('input[name=markRead]:checked', '#setForm').val(),10);
      var includeOldMessages = parseInt($('input[name=dayOld]:checked', '#setForm').val(), 10);
      var currentTime = Math.round(new Date().getTime()/1000.0);
      socket.emit(socketEmitString, {fbid: facebookInfo.userID,
        email: $emailInp.val(),
        atoken: facebookInfo.token,
        atoken_exp: facebookInfo.expire,
        read: includeRead,
        mark: markRead,
        oldNote: includeOldMessages,
        cTime: currentTime
      }, socketCallback);
      scaffold.alertNote($alert, 'warning', alertText);
    });
  }

  socket.on('no user', function(data){
    if(data){
        prepNewUserSubmission();
        addSubmitHandler('add user',
        'Please wait a moment while we create your account.',
        function(){
          $('.newUser').fadeOut();
        }
        );
      }
  });

  addSubmitHandler('save changes',
    'Please wait a moment while your changes are saved.',
    function(){
      console.log('Save Changes Fired');
    }
  );

    function prepNewUserSubmission(){
      console.log('no user found');
      $('#loading').fadeOut();
      $settings.slideDown("slow");
      $settingForm.before($('<h3/>')
        .addClass('newUser')
        .text("Looks like you don't have an account. Fill out the form below to start recieving your Daily Facebook Digest"));
      $emailInp.val(facebookInfo.email);
      $('input:radio[name=inRead]').filter('[value=1]').prop('checked',true);
      $('input:radio[name=dayOld]').filter('[value=1]').prop('checked',true);
      $('input:radio[name=markRead]').filter('[value=1]').prop('checked',true);
      $('#save-changes').text('Create an account');
    }

  return socket;
}

function additionalPageFunctions(socket){
  var $alert = $('#notification');
  var $unSub = $('#unsubscribe');
  var $settings = $('#settings');

  $unSub.click(function(e){
  		e.preventDefault();
      $alert.addClass("alert-danger").html('<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button><h4>Are you Sure!</h4><p>This will end all the awesome facebook emails you are recieving.</p><p><button type="button" id="unsubscribe-affirm" class="btn btn-danger">Yes, I want stop getting emails</button><button type="button" id="unsubscribe-cancel" class="btn btn-default">No, I still want to recieve emails</button></p>').fadeIn(300);
      $('#unsubscribe-affirm').click(function(e){
          nowTime = Math.round(new Date().getTime()/1000.0);
          socket.emit('unsubscribe', {fbid: id_send, cTime: nowTime});
          alertNote($alert, 'success', 'You are now unsubscribed from Brief, sorry to see you go.');
      });
  });

   //Populate existing settings
 socket.on('sendback', function (userSettings) {
   if(userSettings) {
       console.log("Sendback Socket Response");
       $('#loading').fadeOut();
       $settings.slideDown("slow");

       $('#email').val(userSettings.email);
       if (userSettings.incRead == 1){
         $('input:radio[name=inRead]').filter('[value=1]').prop('checked',true);

       } else {
         $('input:radio[name=inRead]').filter('[value=0]').prop('checked',true);
       }
       if (userSettings.mark_read == 1){
         $('input:radio[name=markRead]').filter('[value=1]').prop('checked',true);

       } else {
         $('input:radio[name=markRead]').filter('[value=0]').prop('checked',true);
       }
       if (userSettings.oldNote == 1){
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

  return socket;
}

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
