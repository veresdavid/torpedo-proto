var socket = io("http://localhost:3000");

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
		// TODO: accept button
		// TODO: reject button
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
		// TODO: remove waiting onclick
		var p = $("<p></p>").text("WAIT: " + waiting);
		var cancel = $("<button></button>").attr("onclick", "cancelWaiting('" + waiting + "')").text("CANCEL");
		$(p).append(cancel);
		$("#waitings").append(p);
		// $("#waitings").append("<p>WAITING for " + waiting + "</p>");
	});
});

socket.on("game", () => {
	// hide non-game elements
	hideLobbyElements();
	// reveal game elements
	showGameElements();
});

socket.on("defineMap", (mapTime) => {
	console.log("MAP!!!");
	var timeLeft = mapTime;
	/*var timer = setInterval(function(){
		if(timeLeft > 0){
			timeLeft--;
			console.log(timeLeft);
		}else{
			console.log("EXPIRED!!!");
			clearInterval(timer);
		}
	}, 1000);*/
});

socket.on("turn", () => {
	console.log("YOUR TURN BOY");
});

socket.on("waiting", () => {
	console.log("WAITING FOR OTHER PLAYER");
})

socket.on("noMap", () => {
	alert("NO MAP MADAFAKA!!!");
});

socket.on("disconnect", () => {
	console.log("BYE BYE");
});

// TODO: dont forget to pong server!!!
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
		// $("#users").append("<p>" + user + "</p>");
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

function hideLobbyElements(){
	$("#lobby").css("display", "none");
}

function showGameElements(){
	$("#game").css("display", "block");
}

function ready(){
	socket.emit("ready");
	$("#ready").css("display", "none");
}

function turn(){
	socket.emit("turn");
}