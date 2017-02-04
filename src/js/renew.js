var scaffold = require('./frontendScaffold');

scaffold.frontendScaffold(false,
  document,
  userVerification
);

function userVerification(facebookLoginResponse){
  $('#renew').click(function(e){
    e.preventDefault();
    var parameters = { fbid: facebookLoginResponse.id,
                       token: facebookLoginResponse.token };
    $.get( '/server-get',parameters, function(data) {
      alertNote($alert, 'success', 'You have are now all set to keep receiving your Briefs!');
      console.log(data);
    });
  });
}
