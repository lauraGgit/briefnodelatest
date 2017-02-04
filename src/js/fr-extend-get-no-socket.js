$(document).ready(function() {
  $.validate();
  var $extendBtn = $('#extend');
  var $fbAuth = $('#auth');
  var $alert = $('#notification');
  var $settings = $('#settings');
  var $renew2 = $('#renew2');

  //Load FB api
  window.fbAsyncInit = function() {
    FB.init({
      appId      : '282611145100368',
      xfbml      : true,
      version    : 'v2.3'
    });
    // FB.AppEvents.logPageView();

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
    $('#loading').fadeOut();
    $settings.slideDown("slow");

    //console.log('Welcome!  Fetching your information.... ');
    FB.api('/me', function(response) {
      id_send = response.id;

      $renew2.click(function(e){
        e.preventDefault();
        var parameters = { fbid: id_send, token: token };
        $.get( '/server-get',parameters, function(data) {
          alertNote($alert, 'success', 'You have are now all set to keep receiving your Briefs!');
          console.log(data);
        });
      });

    });
  }
}; //End window.fbAsyncInit

// Load the SDK asynchronously
(function(d){
 var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
 if (d.getElementById(id)) {return;}
 js = d.createElement('script'); js.id = id; js.async = true;
 js.src = "//connect.facebook.net/en_US/all.js";
 ref.parentNode.insertBefore(js, ref);
}(document));


// Helper Functions
   function alertNote($alertDiv, alertClass, text){
    $alertDiv.stop().removeClass("alert-warning alert-success alert-danger alert-info").addClass('alert-'+alertClass).html(text).fadeIn(300).delay(1200).fadeOut(300);
  }

});
