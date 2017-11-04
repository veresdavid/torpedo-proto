var express = require("express");
var http = require("http");
var app = express();
var server = http.createServer(app).listen(3000);
var io = require("socket.io")(server);

var MongoClient = require("mongodb").MongoClient;
var url = "mongodb://localhost:27017/torpedo-proto";

var connections = new Map();

function getOnlineUsers(){
	return Array.from(connections.keys());
}

function getOnlineUsersExcept(username){
	names = getOnlineUsers();
	if(names.includes(username)){
		names.splice(names.indexOf(username), 1);
	}
	return names;
}

io.on("connection", function(socket){

	console.log("NEW CONNECTION");

	socket.emit("authenticate");

	socket.on("authenticate", function(data){

		// get parts of data
		parts = data.split(";");
		username = parts[0];
		password = parts[1];

		// check in database if valid user
		validateUser(socket, username, password);

	});

});

function kickUser(socket){
	console.log("KICKED USER");
	socket.disconnect(true);
}

function connectUser(socket, result){
	console.log("VALID USER");

	// store username in socket, for later uses
	socket.username = result.username;

	// TODO: create connection object and add it to the connections map
	connection = {
		dbdata: result,
		socket: socket
	};
	connections.set(username, connection);

	console.log(getOnlineUsers());

	// TODO: assign callbacks

	socket.emit("authSuccess");

	socket.emit("onlineUsers", getOnlineUsers());
	socket.broadcast.emit("onlineUsers", getOnlineUsers());
	socket.broadcast.emit("userConnected", result.username);

	socket.on("disconnect", () => {
		// TODO: remove user from map
		connections.delete(socket.username);
		socket.broadcast.emit("onlineUsers", getOnlineUsers());
		socket.broadcast.emit("userDisconnected", socket.username);
	});

	socket.on("userMessage", (message) => {
		socket.broadcast.emit("userMessage", socket.username, message);
		socket.emit("userMessage", socket.username, message);
	});

}

function validateUser(socket, username, password){

	console.log("VALIDATING");

	// TODO: mongodb check
	MongoClient.connect(url, (err, db) => {

		if(err){
			console.log("MONGODB ERROR OCCURED :(");
			db.close();
			kickUser(socket);
			return;
		}

		db.collection("users").findOne({username: username, password: password}, (err, result) => {

			if(err){
				console.log("FIND ONE ERROR OCCURED :(");
				db.close();
				kickUser(socket);
				return;
			}

			if(result==null){
				db.close();
				kickUser(socket);
				return;
			}

			console.log("USER FOUND!!!");
			console.log(result);

			// TODO: check if not already connected!!!
			if(connections.has(username)){
				console.log("ALREADY CONNECTED!!!");
				db.close();
				kickUser(socket);
				return;
			}

			db.close();

			connectUser(socket, result);

		});

	});

}