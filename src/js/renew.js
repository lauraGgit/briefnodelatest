var scaffold = require('./frontendScaffold');

scaffold.frontendScaffold(false,
  document,
  userVerification
);

function userVerification(facebookInfo, token){
  var parameters = { fbid: facebookInfo.userID, token: facebookInfo.token };
  
  $('#renew').click(function(e){
    e.preventDefault();
    $.get( '/server-get',parameters, function(data) {
      alertNote($alert, 'success', 'You have are now all set to keep receiving your Briefs!');
      console.log(data);
    });
  });
}
