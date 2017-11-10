var socket = io("http://localhost:3000");

var interval = null;
var timeLeft = 0;

socket.on("authenticate", function(){
	socket.emit("authenticate", secret);
});

socket.on("authSuccess", () => {
	serverMessage("You have joined to the lobby!");
});

socket.on("userConnected", (user) => {
	serverMessage(user + " has connected!");
});

socket.on("userDisconnected", (user) => {
	serverMessage(user + " has disconnected!");
});

socket.on("onlineUsers", (users) => {
	console.log("ONLINEUSERS");
	updateUsers(users);
});

socket.on("userMessage", (user, message) => {
	userMessage(user, message);
});

socket.on("invitations", (invitations) => {
	$("#invitations").empty();
	invitations.forEach((invitation) => {
		var p = $("<p></p>").text("INV: " + invitation);
		var accept = $("<button></button>").attr("onclick", "acceptChallenge('" + invitation + "')").text("ACCEPT");
		var reject = $("<button></button>").attr("onclick", "rejectChallenge('" + invitation + "')").text("REJECT");
		$(p).append(accept).append(reject);
		$("#invitations").append(p);
	});
});

socket.on("waitings", (waitings) => {
	$("#waitings").empty();
	waitings.forEach((waiting) => {
		var p = $("<p></p>").text("WAIT: " + waiting);
		var cancel = $("<button></button>").attr("onclick", "cancelWaiting('" + waiting + "')").text("CANCEL");
		$(p).append(cancel);
		$("#waitings").append(p);
	});
});

socket.on("game", () => {

	// hide non-game elements
	hideLobbyElements();

	// reveal game elements
	showGameElements();

	// clear chat
	clearChat();

	// clear status
	clearStatus();

});

socket.on("defineMap", (mapTime) => {

	console.log("MAP!!!");

	timeLeft = mapTime;

	$("#status").text("Define your map! You have " + timeLeft + " seconds left...");

	interval = setInterval(function() {

		if(timeLeft>0){
			timeLeft--;
			$("#status").text("Define your map! You have " + timeLeft + " seconds left...");
		}else{
			clearInterval(interval);
			$("#status").text("Time has expired!");
		}

	}, 1000);
	
});

socket.on("mapAccepted", () => {

	clearInterval(interval);
	timeout = null;

	$("#status").text("Map accepted!");

});

socket.on("turn", (turnTime) => {

	console.log("YOUR TURN BOY");

	clearInterval(interval);

	timeLeft = turnTime;

	$("#status").text("Your turn! You have " + timeLeft + " seconds left...");

	interval = setInterval(function() {

		if(timeLeft>0){
			timeLeft--;
			$("#status").text("Your turn! You have " + timeLeft + " seconds left...");
		}else{
			clearInterval(interval);
			$("#status").text("Time has expired!");
		}

	}, 1000);

});

socket.on("waiting", (turnTime) => {

	console.log("WAITING FOR OTHER PLAYER");

	clearInterval(interval);

	timeLeft = turnTime;

	$("#status").text("Enemy player's turn! " + timeLeft + " seconds left...");

	interval = setInterval(function() {

		if(timeLeft>0){
			timeLeft--;
			$("#status").text("Enemy player's turn! " + timeLeft + " seconds left...");
		}else{
			clearInterval(interval);
			$("#status").text("Time has expired!");
		}

	}, 1000);

})

socket.on("dodge", () => {

	// TODO: inform the player about the dodge
	alert("Game dodged!");

	console.log("GAME HAS BEEN DODGED!!!");

	hideGameElements();

	showLobbyElements();

	clearChat();

	clearStatus();

	clearInterval(interval);

	serverMessage("You have joined to the lobby!");

});

socket.on("myTurnResult", (turnResult) => {

	console.log("MY TURN RESULT");
	console.log(turnResult);

	// TODO: turnResult object contains the information about the shot
	// structure:
	/*
		turnResult = {
			position: {x: .., y: ..},	<-- a coordinate pair
			hit: true|false,			<-- did we hit something?
			sunk: true|false			<-- did it sink?
		};
	*/
	// display shots or ship parts in the game field
	// cant aim those coordinates where we have already sent shot

});

socket.on("enemyTurnResult", (turnResult) => {

	console.log("ENEMY TURN RESULT");
	console.log(turnResult);

	// TODO: turnResult object contains the information about the shot
	// same as above

});

socket.on("win", () => {

	console.log("WIN!!!");

	// TODO: inform the player about the win

	hideGameElements();

	showLobbyElements();

	clearChat();

	clearStatus();

	serverMessage("You have joined to the lobby!");

});

socket.on("lose", () => {

	console.log("LOSE :(");

	// TODO: inform the player about the lose

	hideGameElements();

	showLobbyElements();

	clearChat();

	clearStatus();

	serverMessage("You have joined to the lobby!");

});

socket.on("disconnect", () => {
	console.log("BYE BYE");
});

// respond on ping message, unless we gonna disconnect
socket.on("ping", () => {
	socket.emit("pong");
});

function updateUsers(users){
	$("#users").empty();
	users.forEach((user) => {
		var p = $("<p></p>").text(user);
		var inv = $("<button></button>").attr("onclick", "challenge('" + user + "')").text("CHALLENGE");
		$(p).append(inv);
		$("#users").append(p);
	});
}

function serverMessage(message){
	$("#chat").append("<p><b>" + message + "</b></p>");
}

function userMessage(user, message){
	$("#chat").append("<p><b>" + user + ":</b> " + message + "</p>");
}

function sendMessage(){

	var message = $("#message").val();

	socket.emit("userMessage", message);

	$("#message").val("");

}

$(document).ready(function(){
	$("#game").css("display", "none");
});

function challenge(user){
	socket.emit("challenge", user);
}

function acceptChallenge(user){
	socket.emit("acceptChallenge", user);
}

function rejectChallenge(user){
	socket.emit("rejectChallenge", user);
}

function cancelWaiting(user){
	socket.emit("cancelWaiting", user);
}

function clearLobbyElements(){
	$("#invitations").empty();
	$("#waitings").empty();
	$("#users").empty();
}

function clearChat(){
	$("#chat").empty();
}

function clearStatus(){
	$("#status").empty();
}

function hideLobbyElements(){

	// clear divs
	clearLobbyElements();

	// hide them
	$("#lobby").css("display", "none");

}

function showLobbyElements(){
	$("#lobby").css("display", "block");
}

function hideGameElements(){
	$("#game").css("display", "none");
}

function showGameElements(){
	$("#ready").css("display", "block");
	$("#game").css("display", "block");
}

function ready(){
	socket.emit("ready");
	$("#ready").css("display", "none");
}

function map(){

	// TODO: assign this function to a button

	// TODO: get the map object
	// var map = ...	<-- assign the map object to this variable

	socket.emit("map", map);

}

function turn(){

	// TODO: assign this function to a button

	// TODO: need the position object
	// var position = ...	<-- just put the targeted position inside this variable

	// send the shot to the server
	socket.emit("turn", position);
}