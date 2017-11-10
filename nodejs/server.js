var express = require("express");
var http = require("http");
var app = express();
var server = http.createServer(app).listen(3000);
var io = require("socket.io")(server);

var MongoClient = require("mongodb").MongoClient;
var url = "mongodb://localhost:27017/torpedo-proto";

var connections = new Map();

// in seconds
const MAP_TIME = 60;
const TURN_TIME = 20;

function getOnlineUsers(){
	return Array.from(connections.keys());
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
		waitings: []
	};
	connections.set(username, connection);

	// join socket to lobby room
	socket.join("lobby");

	console.log(getOnlineUsers());

	// TODO: assign callbacks

	socket.emit("authSuccess");

	socket.emit("onlineUsers", getLobbyUsers());
	// socket.broadcast.emit("onlineUsers", getOnlineUsers());
	// socket.broadcast.emit("userConnected", result.username);
	socket.to("lobby").emit("onlineUsers", getLobbyUsers());
	socket.to("lobby").emit("userConnected", result.username);

	socket.on("disconnect", () => {

		// if in game
		if(socket.game!=null){
			dodgeGame(socket.game);
		}

		// if not in game
		if(socket.game==null){
			// TODO: delete inviations and waitings and inform other players
			var current = connections.get(socket.username);
			// delete invitations
			current.invitations.forEach((invitation) => {
				var actual = connections.get(invitation);
				if(actual.waitings.includes(socket.username)){
					actual.waitings.splice(actual.waitings.indexOf(socket.username), 1);
					actual.socket.emit("waitings", actual.waitings);
				}
			});
			// delete waitings
			current.waitings.forEach((waiting) => {
				var actual = connections.get(waiting);
				if(actual.invitations.includes(socket.username)){
					actual.invitations.splice(actual.invitations.indexOf(socket.username), 1);
					actual.socket.emit("invitations", actual.invitations);
				}
			});
			// empty arrays
			current.invitations = [];
			current.waitings = [];
		}

		// TODO: remove user from map
		connections.delete(socket.username);
		// socket.broadcast.emit("onlineUsers", getOnlineUsers());
		// socket.broadcast.emit("userDisconnected", socket.username);
		socket.to("lobby").emit("onlineUsers", getLobbyUsers());
		socket.to("lobby").emit("userDisconnected", socket.username);
	});

	socket.on("userMessage", (message) => {

		if(socket.game==null){
			// socket.broadcast.emit("userMessage", socket.username, message);
			socket.to("lobby").emit("userMessage", socket.username, message);
			socket.emit("userMessage", socket.username, message);
		}else{
			var room = socket.game.room;
			socket.to(room).emit("userMessage", socket.username, message);
			socket.emit("userMessage", socket.username, message);
		}

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
		if(other.socket.game!=null){
			console.log("ALREADY IN GAME!!!");
			return;
		}

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
		// ships
		var ships = new Array(2);
		// shots
		var shots = [new Set(), new Set()];
		// turn
		var turn = 0;
		// ready?
		var ready = [false, false];
		// timeout
		var timeout = null;
		// game chat room
		var room = players[0].socket.username + "-vs-" + players[1].socket.username;

		// game object
		var game = {
			players: players,
			maps: maps,
			ships: ships,
			shots: shots,
			turn: turn,
			ready: ready,
			timeout: timeout,
			room: room
		};

		// store game reference in sockets
		current.socket.game = game;
		other.socket.game = game;

		// join players to chat room
		current.socket.join(room);
		current.socket.leave("lobby");
		other.socket.join(room);
		other.socket.leave("lobby");

		// inform users in lobby if 2 players go for a game
		current.socket.to("lobby").emit("onlineUsers", getLobbyUsers());

		// init game interface for players
		current.socket.emit("game");
		other.socket.emit("game");

		console.log("WAITING FOR PLAYERS TO GET READY!!!");
		// TODO: maybe a timeout for here too?

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

	socket.on("ready", () => {

		// TODO: NOT SECURE!!! USE ARRAY!!!

		// in game?
		if(socket.game==null){
			console.log("NOT IN GAME!!!");
			return;
		}

		// in "waiting for ready" status?
		var game = socket.game;
		var playerIndex = getPlayerIndex(game, socket);
		if(arePlayersReady(game)){
			console.log("NOT IN WAITING FOR READY STATUS!!!");
			return;
		}

		// player is ready
		game.ready[playerIndex] = true;

		// if ready==0 then ask maps from the players
		if(arePlayersReady(game)){

			// ask player to define map and start timeout function
			startMapState(game);

		}

	});

	socket.on("map", (map) => {

		// in game?
		if(socket.game==null){
			console.log("NOT IN GAME!!!");
			return;
		}

		// already have map?
		var game = socket.game;
		var index = (game.players[0].socket==socket)?(0):(1);
		if(game.maps[index]!=null){
			console.log("ALREADY SENT MAP!!!");
			return;
		}

		// in map state?
		if(!arePlayersReady(game)){
			console.log("PLAYERS NOT READY YET!!!");
			return;
		}

		// valid map?
		var validMap = validateMap(map);
		if(!validMap){
			console.log("NOT VALID MAP!!!");
			// TODO: send message to socket?
			return;
		}

		// set map for the player
		console.log(game.players[index].socket.username + " is #" + index);
		game.maps[index] = map;

		// store ships
		game.ships[index] = extractShipsFromMap(game.maps[index]);

		// inform player
		socket.emit("mapAccepted");

		// if have all the maps
		if(game.maps[0]!=null && game.maps[1]!=null){

			// stop timeout if players have sent their map
			clearTimeout(game.timeout);
			game.timeout = null;

			// request first player to shot
			// game.players[game.turn].socket.emit("turn");
			nextTurn(game);

		}

	});

	socket.on("turn", (position) => {

		// in game??
		if(socket.game==null){
			console.log("NOT IN GAME");
			return;
		}

		// maps ready??
		var game = socket.game;
		if(game.maps[0]==null || game.maps[1]==null){
			console.log("MAPS NOT READY YET!!!");
			return;
		}

		// is it the players turn?
		var playerIndex = getPlayerIndex(game, socket);
		if(game.turn!=playerIndex){
			console.log("NOT YOUR TURN!!!");
			return;
		}

		// valid shot position?
		if(!isValidPosition(position)){
			console.log("INVALID POSITION!!!");
			return;
		}

		// havent shot there already??
		if(game.shots[playerIndex].has(positionValue(position))){
			console.log("ALREADY SHOT THERE!!!");
			return;
		}

		// if everything is valid, stop the timeouts
		clearTimeout(game.timeout);
		game.timeout = null;

		// store shot
		game.shots[playerIndex].add(positionValue(position));
		console.log(game.shots[playerIndex]);

		// get ship and part index
		var targetPlayerIndex = 1 - playerIndex;
		var ships = game.ships[targetPlayerIndex];
		var result = getShipAndPartIndex(ships, position);

		if(result==null){

			// miss
			var turnResult = createTurnResult(position, false, false);

			// inform players
			game.players[playerIndex].socket.emit("myTurnResult", turnResult);
			game.players[targetPlayerIndex].socket.emit("enemyTurnResult", turnResult);

			// next player comes
			var nextPlayerIndex = 1 - game.turn;
			game.turn = nextPlayerIndex;
			nextTurn(game);

		}else{

			// hit

			// update ships
			ships[result.shipIndex][result.partIndex] = null;

			// sunk?
			var sunk = isShipSunk(ships[result.shipIndex]);
			var turnResult = createTurnResult(position, true, sunk);

			// inform players
			game.players[playerIndex].socket.emit("myTurnResult", turnResult);
			game.players[targetPlayerIndex].socket.emit("enemyTurnResult", turnResult);

			var gameOver = areAllShipSunk(ships);

			if(gameOver){

				// inform players
				game.players[playerIndex].socket.emit("win");
				game.players[targetPlayerIndex].socket.emit("lose");

				// save data
				var gameData = {
					player1: game.players[0].socket.username,
					player2: game.players[1].socket.username,
					map1: game.maps[0],
					map2: game.maps[1],
					winner: game.players[playerIndex].socket.username,
					loser: game.players[targetPlayerIndex].socket.username,
					date: new Date()
				};

				saveGameData(gameData);

				// null things

				// set timeout to null
				if(game.timeout!=null){
					clearTimeout(game.timeout);
					game.timeout = null;
				}

				// go back to lobby room
				game.players[0].socket.leave(game.room);
				game.players[1].socket.leave(game.room);
				game.players[0].socket.join("lobby");
				game.players[1].socket.join("lobby");

				// null game references
				game.players[0].socket.game = null;
				game.players[1].socket.game = null;

			}else{

				// same player comes
				nextTurn(game);

			}

		}

	});

}

function getLobbyUsers(){

	var lobbyUsers = [];

	connections.forEach((value, key, map) => {
		if(value.socket.game==null) lobbyUsers.push(key);
	});

	return lobbyUsers;

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

function saveGameData(gameData){

	console.log("SAVING GAME DATA");

	MongoClient.connect(url, (err, db) => {

		if(err){
			console.log("MONGODB ERROR OCCURED :(");
			db.close();
			return;
		}

		db.collection("games").insertOne(gameData, (err, result) => {

			if(err){
				console.log("INSERT ONE ERROR OCCURED :(");
				db.close();
				return;
			}

			console.log("GAME HAS BEEN SAVED!");

			db.close();

		});

	});

}

function startMapState(game){

	// request maps from the players
	game.players[0].socket.emit("defineMap", MAP_TIME);
	game.players[1].socket.emit("defineMap", MAP_TIME);

	// set timeout function
	game.timeout = setTimeout(function() {

		if(game.maps[0]==null || game.maps[1]==null){
			game.timeout = null;
			dodgeGame(game);
		}

	}, MAP_TIME * 1000);

}

function dodgeGame(game){

	console.log(game.players[0].socket.username + " vs " + game.players[1].socket.username + " game has been dodged!!!");

	// set timeout to null
	if(game.timeout!=null){
		clearTimeout(game.timeout);
		game.timeout = null;
	}

	// save something?

	// inform players about dodge
	game.players[0].socket.emit("dodge");
	game.players[1].socket.emit("dodge");

	// go back to lobby room
	game.players[0].socket.leave(game.room);
	game.players[1].socket.leave(game.room);
	game.players[0].socket.join("lobby");
	game.players[1].socket.join("lobby");

	// null game references
	game.players[0].socket.game = null;
	game.players[1].socket.game = null;

	// send lobby users
	game.players[0].socket.to("lobby").emit("onlineUsers", getLobbyUsers());
	game.players[0].socket.emit("onlineUsers", getLobbyUsers());

}

function validateMap(map){
	// validate if fields exist and have the exact lengths
	// ONE
	if(!arrayExistsAndHasCorrectSize(map.one, 4)) return false;
	// TWO
	if(!arrayExistsAndHasCorrectSize(map.two, 3)) return false;
	// THREE
	if(!arrayExistsAndHasCorrectSize(map.three, 2)) return false;
	// FOUR
	if(!arrayExistsAndHasCorrectSize(map.four, 1)) return false;

	// validate parts inside ships
	var positions = [];
	// ONE
	for(var i=0; i<map.one.length; i++){
		var ship = map.one[i];
		if(!arrayExistsAndHasCorrectSize(ship.position, 1)) return false;
		positions = positions.concat(ship.position);
	}
	// TWO
	for(var i=0; i<map.two.length; i++){
		var ship = map.two[i];
		if(!arrayExistsAndHasCorrectSize(ship.position, 2)) return false;
		positions = positions.concat(ship.position);
	}
	// THREE
	for(var i=0; i<map.three.length; i++){
		var ship = map.three[i];
		if(!arrayExistsAndHasCorrectSize(ship.position, 3)) return false;
		positions = positions.concat(ship.position);
	}
	// FOUR
	for(var i=0; i<map.four.length; i++){
		var ship = map.four[i];
		if(!arrayExistsAndHasCorrectSize(ship.position, 4)) return false;
		positions = positions.concat(ship.position);
	}

	// validate all positions
	var positionValues = new Set();
	for(var i=0; i<positions.length; i++){
		var position = positions[i];
		if(!isValidPosition(position)) return false;
		var posVal = positionValue(position);
		positionValues.add(posVal);
	}

	// validate if parts not overlap
	var numberOfShips = 4*1 + 3*2 + 2*3 + 1*4;
	if(positionValues.size!=numberOfShips) return false;

	return true;
}

function arrayExistsAndHasCorrectSize(array, size){

	if(array==null) return false;

	if(array.constructor!==Array) return false;

	if(array.length!=size) return false;

	return true;

}

function isValidPosition(position){

	if(position.x==null || position.y==null) return false;

	var x = position.x;
	var y = position.y;

	if(x<0 || x>9 || y<0 || y>9) return false;

	return true;

}

function positionValue(position){
	return position.x * 10 + position.y;
}

function arePlayersReady(game){
	return game.ready[0]==true && game.ready[1]==true;
}

function getPlayerIndex(game, socket){

	if(game.players[0].socket==socket) return 0;

	if(game.players[1].socket==socket) return 1;

	return -1;

}

function nextTurn(game){

	// send messages to players
	// turn
	// waiting for other
	var actual = game.players[game.turn];
	var waiting = game.players[1-game.turn];

	actual.socket.emit("turn", TURN_TIME);
	waiting.socket.emit("waiting", TURN_TIME);

	// start timeout
	game.timeout = setTimeout(function() {

		console.log("KECSKE");

		// actual player didnt do anything, so next player is coming
		var nextPlayerIndex = 1 - game.turn;
		game.turn = nextPlayerIndex;

		// null timeout
		clearTimeout(game.timeout);
		game.timeout = null;

		// nextTurn
		nextTurn(game);

	}, TURN_TIME * 1000);

}

function extractShipsFromMap(map){

	var ships = [];

	// ONE
	map.one.forEach((ship) => {
		ships.push(ship.position);
	});

	// TWO
	map.two.forEach((ship) => {
		ships.push(ship.position);
	});

	// THREE
	map.three.forEach((ship) => {
		ships.push(ship.position);
	});

	// FOUR
	map.four.forEach((ship) => {
		ships.push(ship.position);
	});

	return ships;

}

function getShipAndPartIndex(ships, position){

	for(var shipIndex=0; shipIndex<ships.length; shipIndex++){

		var ship = ships[shipIndex];

		for(var partIndex=0; partIndex<ship.length; partIndex++){

			var part = ship[partIndex];

			if(part!=null && part.x==position.x && part.y==position.y){

				var result = {
					shipIndex: shipIndex,
					partIndex: partIndex
				};

				return result;

			}

		}

	}

	return null;

}

function createTurnResult(position, hit, sunk){

	var result = {
		position: position,
		hit: hit,
		sunk: sunk
	};

	return result;

}

function isShipSunk(ship){

	for(var i=0; i<ship.length; i++){
		if(ship[i]!=null) return false;
	}

	return true;

}

function areAllShipSunk(ships){

	for(var i=0; i<ships.length; i++){
		if(!isShipSunk(ships[i])) return false;
	}

	return true;

}