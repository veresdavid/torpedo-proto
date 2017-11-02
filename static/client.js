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
		$("#users").append("<p>" + user + "</p>");
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