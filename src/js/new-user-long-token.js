var scaffold = require('./frontendScaffold');

scaffold.frontendScaffold(false,
  document,
  userVerification
);

function userVerification(facebookInfo, token){
  var parameters = { fbid: facebookInfo.userID, token: facebookInfo.token };
  $.get( '/server-get', parameters, function(data) {
    scaffold.alertNote($('#notification'), 'success', 'You have are now all set to keep receiving your Briefs!');
    $('#complete').fadeIn(100).delay(1000).fadeOut(100, function(){
      window.location.replace("/");
    });
  });
}
