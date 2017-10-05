$(function() {
	
  // cache elements
  var winner_container = $('#name');
  var buzzers_container = $('#buzzers');
  var buzz_players = {};
  var buzz_order = [];
  var socket = io.connect(document.location.protocol + '//' + document.location.host);  
  
// set up the clear button
  $('#clear-buzzes').click(function() {
    buzz_players = {};
    buzz_order = [];
    $(buzzers_container).empty();
	$(winner_container).empty();
  });

   // set up socket.io


  socket.on('buzz_display', function(player) {
    // refresh the model
    if(!(player.name in buzz_players)) {
      buzz_order.push(player.name);
    }
    buzz_players[player.name] = null;

    // refresh the view
    buzzers_container.empty();
    for(var i in buzz_order) {
      var name = buzz_order[i];
      $(buzzers_container).append('<li>' + name + '</li>');
    }
	$(winner_container).text(buzz_order[0]);
  });
})


