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
		socket: socket,
		invitations: [],
		waitings: [],
		game: null
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

	socket.on("challenge", (user) => {

		// TODO: check if user exists
		if(!connections.has(user)){
			console.log("NO SUCH USER!!!");
			return;
		}

		// TODO: check if not inviting itself
		if(socket.username === user){
			console.log("CANT INVITE YOURSELF!!!");
			return;
		}

		// get connection objects
		var other = connections.get(user);
		var current = connections.get(socket.username);

		// TODO: check if not already:
		// - invited other user
		if(current.waitings.includes(user)){
			console.log("ALREADY INVITED!!!");
			return;
		}
		// - invited by other user
		if(other.waitings.includes(socket.username)){
			console.log("ALREADY INVITED BY OTHER USER!!!");
			return;
		}

		// TODO: check if not in game

		// TODO: update invitations on other user
		other.invitations.push(socket.username);
		other.socket.emit("invitations", other.invitations);

		// TODO: update waitings on current user
		current.waitings.push(user);
		socket.emit("waitings", current.waitings);

	});

	socket.on("acceptChallenge", (user) => {

		// TODO: is there such user
		if(!connections.has(user)){
			console.log("NO SUCH USER!!!");
			return;
		}

		// TODO: is there such invitation
		var current = connections.get(socket.username);
		var other = connections.get(user);
		if(!(current.invitations.includes(user) && other.waitings.includes(socket.username))){
			console.log("NO SUCH INVITATION!!!");
			return;
		}

		// TODO: remove invitation and waiting from connections
		current.invitations.splice(current.invitations.indexOf(user), 1);
		other.waitings.splice(other.waitings.indexOf(socket.username), 1);

		// TODO: inform other invitations and waitings
		current.invitations.forEach((invitation) => {
			var actual = connections.get(invitation);
			if(actual.waitings.includes(socket.username)){
				actual.waitings.splice(actual.waitings.indexOf(socket.username), 1);
				actual.socket.emit("waitings", actual.waitings);
			}
		});

		current.waitings.forEach((waiting) => {
			var actual = connections.get(waiting);
			if(actual.invitations.includes(socket.username)){
				actual.invitations.splice(actual.invitations.indexOf(socket.username), 1);
				actual.socket.emit("invitations", actual.invitations);
			}
		});

		other.invitations.forEach((invitation) => {
			var actual = connections.get(invitation);
			if(actual.waitings.includes(user)){
				actual.waitings.splice(actual.waitings.indexOf(user), 1);
				actual.socket.emit("waitings", actual.waitings);
			}
		});

		other.waitings.forEach((waiting) => {
			var actual = connections.get(waiting);
			if(actual.invitations.includes(user)){
				actual.invitations.splice(actual.invitations.indexOf(user), 1);
				actual.socket.emit("invitations", actual.invitations);
			}
		});

		// TODO: empty the 2 players invitations and waitings and inform them
		current.invitations = [];
		current.waitings = [];
		current.socket.emit("invitations", current.invitations);
		current.socket.emit("waitings", current.waitings);

		other.invitations = [];
		other.waitings = [];
		other.socket.emit("invitations", other.invitations);
		other.socket.emit("waitings", other.waitings);

		// TODO: start game

		// players
		var players = new Array(2);
		// who is the first?
		var index = Math.round(Math.random());
		players[index] = current;
		players[1 - index] = other;
		// maps
		var maps = new Array(2);
		// turn
		var turn = 0;
		// ready?
		var ready = 2;
		// timeouts
		var timeouts = new Array(2);

		// game object
		var game = {
			players: players,
			maps: maps,
			turn: turn,
			ready: ready,
			timeouts: timeouts
		};

		// store game reference in sockets
		current.socket.game = game;
		other.socket.game = game;

		// ask for maps
		var mapTime = 10; // in seconds
		current.socket.emit("defineMap", mapTime);
		other.socket.emit("defineMap", mapTime);
		timeouts[0] = setTimeout(function() {
			players[0].socket.emit("noMap");
			timeouts[0] = null;
		}, mapTime * 1000);
		timeouts[1] = setTimeout(function() {
			players[1].socket.emit("noMap");
			timeouts[1] = null;
		}, mapTime * 1000);

		// store it in the connection objects

	});

	socket.on("rejectChallenge", (user) => {

		// TODO: check if user exists
		if(!connections.has(user)){
			console.log("NO SUCH USER!!!");
			return;
		}

		// TODO: check if challenge exists
		var current = connections.get(socket.username);
		if(!current.invitations.includes(user)){
			console.log("NO SUCH INVITATION!!!");
			return;
		}

		// TODO: remove invitaion from current user and update
		current.invitations.splice(current.invitations.indexOf(user), 1);
		socket.emit("invitations", current.invitations);

		// TODO: remove waiting from other user and update
		var other = connections.get(user);
		other.waitings.splice(other.waitings.indexOf(socket.username), 1);
		other.socket.emit("waitings", other.waitings);

	});

	socket.on("cancelWaiting", (user) => {

		if(!connections.has(user)){
			console.log("NO SUCH USER!!!");
			return;
		}

		var current = connections.get(socket.username);

		if(!current.waitings.includes(user)){
			console.log("NO SUCH INVITATION!!!");
			return;
		}

		current.waitings.splice(current.waitings.indexOf(user), 1);
		socket.emit("waitings", current.waitings);

		var other = connections.get(user);
		other.invitations.splice(other.invitations.indexOf(socket.username), 1);
		other.socket.emit("invitations", other.invitations);

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