var express = require("express");
var http = require("http");
var app = express();
var server = http.createServer(app).listen(3000);
var io = require("socket.io")(server);

var MongoClient = require("mongodb").MongoClient;
var url = "mongodb://localhost:27017/torpedo-proto";

io.on("connection", function(socket){

	console.log("NEW CONNECTION");

	socket.emit("authenticate");

	socket.on("authenticate", function(data){
		
		decrypted = decrypt(data);

		// get parts of data
		parts = decrypted.split(";");
		username = parts[0];
		password = parts[1];

		// check in database if valid user
		valid = validateUser(socket, username, password);

	});

});

function decrypt(data){
	// TODO: decrypt the data!!!
	return data;
}

function kickUser(socket){
	console.log("KICKED USER");
	socket.disconnect(true);
}

function connectUser(socket, result){
	console.log("VALID USER");

	// TODO: save user data into socket object

	// TODO: assign callbacks

	socket.emit("auth_success");
	
	socket.on("message", (message) => {
		console.log(message);
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
		}

		db.collection("users").findOne({username: username, password: password}, (err, result) => {

			if(err){
				console.log("FIND ONE ERROR OCCURED :(");
				db.close();
				kickUser(socket);
			}

			if(result==null){
				db.close();
				kickUser(socket);
			}

			console.log("USER FOUND!!!");
			console.log(result);

			db.close();

			connectUser(socket, result);

		});

	});

}