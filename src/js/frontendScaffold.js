var frontendScaffold = function(useSocket, doc, facebookConnectCallback, additionalPageFunctions){
  if(useSocket){
    var socket = io.connect();
    var socketConnected = false;

    socket.on('message', function(data){
      socketConnected = true;
      console.log(data.message);
      (function(d, s, id){
         var js, fjs = d.getElementsByTagName(s)[0];
         if (d.getElementById(id)) {return;}
         js = d.createElement(s); js.id = id;
         js.src = "//connect.facebook.net/en_US/sdk.js";
         fjs.parentNode.insertBefore(js, fjs);
       }(document, 'script', 'facebook-jssdk'));
    });
  } else {
    (function(d, s, id){
       var js, fjs = d.getElementsByTagName(s)[0];
       if (d.getElementById(id)) {return;}
       js = d.createElement(s); js.id = id;
       js.src = "//connect.facebook.net/en_US/sdk.js";
       fjs.parentNode.insertBefore(js, fjs);
     }(document, 'script', 'facebook-jssdk'));
  }

  window.fbAsyncInit = function() {
    FB.init({
      appId      : '282611145100368',
      xfbml      : true,
      version    : 'v2.3'
    });
    FB.AppEvents.logPageView();

    $(doc).ready(function(){
      $.validate();
      var $settingForm = $('#setForm');
      var $fbAuth = $('#auth');
      var $alert = $('#notification');
      var $unSub = $('#unsubscribe');
      var $settings = $('#settings');

      FB.getLoginStatus(function(response) {
        statusChangeCallback(response);
      });

      function statusChangeCallback(response){
        console.log("Facebook getLoginStatus Called");
        if (response.status === 'connected') {
          successfullLoginCallback(response.authResponse.accessToken, response.authResponse.expiresIn);
        } else if (response.status === 'not_authorized') {
          console.log("App Not Authorized");
          alertNote($alert, 'warning', 'Please allow Brief access to Facebook.');
        } else {
          console.log("Not Logged in");
          alertNote($alert, 'warning', 'Please login to allow Brief access to Facebook.');
        }
      }

      $fbAuth.click(function(e){
        e.preventDefault();
        FB.login(function(response){
          successfullLoginCallback(response.authResponse.accessToken, response.authResponse.expiresIn, true);
          },
          {scope: 'email,user_likes,manage_notifications'});
        });

      function successfullLoginCallback(token, expire) {
        console.log("User logged into Facebook successfully.");

        //Update UI
        $fbAuth.fadeOut("slow", function(){
          if(useSocket){
            $('#loading').fadeIn("slow", function(){
              $('#welcome').fadeOut();
            });
          } else {
            $settings.fadeIn();
          }
        });

        FB.api('/me', function(loginResponse) {
          if (useSocket) {
            if (socketConnected) {
              facebookConnectCallback(loginResponse, socket);
            } else {
              console.log('Socket Not Yet loaded');
            }
          } else {
            facebookConnectCallback(loginResponse);
          }
        }); //End Fb Response
      } //End successfullLoginCallback

      if(additionalPageFunctions){
        //Optional Page Functions
        additionalPageFunctions(socket);
      }

    }); // End document ready
  }; //End Window Async
}

function alertNote($alertDiv, alertClass, text){
  $alertDiv.stop()
    .removeClass("alert-warning alert-success alert-danger alert-info")
    .addClass('alert-'+alertClass)
    .html(text)
    .fadeIn(300)
    .delay(1200)
    .fadeOut(300);
}

exports.frontendScaffold = frontendScaffold;
exports.alertNote = alertNote;
