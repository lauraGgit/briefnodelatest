$(document).ready(function() {
  $.validate();
  var logged = false;
  var $extendBtn = $('#extend');
  var $fbAuth = $('#auth');
  var $alert = $('#notification');
  var $settings = $('#settings');
  var $renew2 = $('#renew2');

  //Init Login Functions
  $fbAuth.click(function(e){
    e.preventDefault();
    FB.login(function(resp){
      console.log('login');
    },
    {scope: 'email,user_likes,manage_notifications'});
  });

  if(!logged){ $fbAuth.show();}

  //Load FB api
  window.fbAsyncInit = function() {
    FB.init({
      appId      : '282611145100368',
      xfbml      : true,
      version    : 'v2.3'
    });
    // FB.AppEvents.logPageView();

    FB.Event.subscribe('auth.authResponseChange', function(response) {
      // Here we specify what we do with the response anytime this event occurs.
      if (response.status === 'connected') {
        $fbAuth.fadeOut("slow");
        $('#loading').fadeIn("slow");
        $('#welcome').fadeOut();
        logged = true;
        successAPI(response.authResponse.accessToken, response.authResponse.expiresIn);
      } else if (response.status === 'not_authorized') {
        $('#auth').fadeIn("slow").click(function(e) {
          e.preventDefault();
          console.log('clicked');
            FB.login(function(response) {
            // handle the response
            successAPI(response.authResponse.accessToken, response.authResponse.expiresIn);
            }, {scope: 'email,user_likes,manage_notifications'});
        });
      } else {
        $('#auth').fadeIn("slow").click(function(e) {
          e.preventDefault();
          console.log('clicked');
          FB.login(function(response) {
            // handle the response
          successAPI(response.authResponse.accessToken, response.authResponse.expiresIn);
          }, {scope: 'email,user_likes,manage_notifications'});
        });
      }
  });
};

// Load the SDK asynchronously
(function(d){
 var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
 if (d.getElementById(id)) {return;}
 js = d.createElement('script'); js.id = id; js.async = true;
 js.src = "//connect.facebook.net/en_US/all.js";
 ref.parentNode.insertBefore(js, ref);
}(document));

// Here we run a very simple test of the Graph API after login is successful.
function successAPI(token, expire) {
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
// Helper Functions
   function alertNote($alertDiv, alertClass, text){
    $alertDiv.stop().removeClass("alert-warning alert-success alert-danger alert-info").addClass('alert-'+alertClass).html(text).fadeIn(300).delay(1200).fadeOut(300);
  }

});
