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
	var head = $("<p class=\"list-group-item active\">Invitations</p>");
	$("#invitations").append(head);
	invitations.forEach((invitation) => {
		var p = $("<div class=\"list-group-item list-group-item-action\"></div>").text(invitation);
		var accept = $("<button class=\"myButton btn btn-primary\"></button>").attr("onclick", "acceptChallenge('" + invitation + "')").text("accept");
		var reject = $("<button class=\"myButton btn btn-primary\"></button>").attr("onclick", "rejectChallenge('" + invitation + "')").text("reject");
		$(p).append(accept).append(reject);
		$("#invitations").append(p);
	});
});

socket.on("waitings", (waitings) => {
	$("#waitings").empty();
	var head = $("<p class=\"list-group-item active\">Waitings</p>");
	$("#waitings").append(head);
	waitings.forEach((waiting) => {
		var p = $("<div class=\"list-group-item list-group-item-action\"></div>").text(waiting);
		var cancel = $("<button class=\"myButton btn btn-primary\"></button>").attr("onclick", "cancelWaiting('" + waiting + "')").text("cancel");
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

	var yPos = turnResult["position"]["x"];
	var xPos = turnResult["position"]["y"];

	console.log(yPos + " " + xPos);

	fireMatrix[yPos][xPos] = 1;
	if(turnResult["hit"]) {
		opponentTableMatrix[yPos][xPos].children[0].src = "/static/x.svg";
		console.log(opponentTableMatrix[yPos][xPos]);
		console.log(opponentTableMatrix[yPos][xPos].children[0]);
	} else {
		opponentTableMatrix[yPos][xPos].children[0].src = "/static/circle.svg";
		console.log(opponentTableMatrix[yPos][xPos]);
		console.log(opponentTableMatrix[yPos][xPos].children[0]);
	}

	if(turnResult["sunk"]){
		var yPositions = [];
		var xPositions = [];
		var ship = turnResult["ship"];

		for(var i = 0; i < ship.length; i++){
			yPositions.push(ship[i]["x"]);
			xPositions.push(ship[i]["y"]);
		}

		console.log(yPositions);
		console.log(xPositions);

		if(yPositions[0] != yPositions[yPositions.length - 1]){
			// vertical ship
			for(var i = 0; i < yPositions.length; i++){
				var td = opponentTableMatrix[yPositions[i]][xPositions[i]];
				$(td).css("background-image", "url(/static/line.svg)");
				$(td).css("-webkit-transform", "rotate(90deg)");
				$(td).css("-moz-transform", "rotate(90deg)");
				$(td).css("-ms-transform", "rotate(90deg)");
				$(td).css("-o-transform", "rotate(90deg)");
				$(td).css("transform", "rotate(90deg)");
				console.log(td);
			}
		} else {
			// horizontal ship
			for(var i = 0; i < xPositions.length; i++){
				var td = opponentTableMatrix[yPositions[i]][xPositions[i]];
				$(td).css("background-image", "url(/static/line.svg)");
				console.log(td);
			}
		}
	}

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

	var yPos = turnResult["position"]["x"];
	var xPos = turnResult["position"]["y"];

	if(turnResult["hit"]) {
		userTableMatrix[yPos][xPos].children[0].src = "/static/x.svg";
	} else {
		userTableMatrix[yPos][xPos].children[0].src = "/static/circle.svg";
	}

	if(turnResult["sunk"]){
		var yPositions = [];
		var xPositions = [];
		var ship = turnResult["ship"];

		for(var i = 0; i < ship.length; i++){
			yPositions.push(ship[i]["x"]);
			xPositions.push(ship[i]["y"]);
		}

		if(yPositions[0] != yPositions[yPositions.length - 1]){
			// vertical ship
			for(var i = 0; i < yPositions.length; i++){
				var td = userTableMatrix[yPositions[i]][xPositions[i]];
				$(td).css("background-image", "url(/static/line.svg)");
				$(td).css("-webkit-transform", "rotate(90deg)");
				$(td).css("-moz-transform", "rotate(90deg)");
				$(td).css("-ms-transform", "rotate(90deg)");
				$(td).css("-o-transform", "rotate(90deg)");
				$(td).css("transform", "rotate(90deg)");
			}
		} else {
			// horizontal ship
			for(var i = 0; i < xPositions.length; i++){
				var td = userTableMatrix[yPositions[i]][xPositions[i]];
				$(td).css("background-image", "url(/static/line.svg)");
			}
		}
	}

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
	var head = $("<p class=\"list-group-item active\">Online players</p>");
	$("#users").append(head);
	users.forEach((user) => {
		var p = $("<div class=\"list-group-item list-group-item-action\"><a style=\" padding-right: 10px;\" href=\"/user/" + user +"\">" + user + "</a></div>");
		var inv = $("<button class=\"btn btn-primary\"></button>").attr("onclick", "challenge('" + user + "')").text("challenge");
		$(p).append(inv);
		$("#users").append(p);
	});
}

var isNextMessageRight = true;

function serverMessage(message){
	var position = "";
	if(isNextMessageRight){
		position = "right";
	} else {
		position = "left";
	}
	var newMessage = `<li class="` + position + ` clearfix">
        <div class="chat-body clearfix">
	        <div class="header">
	            <strong class="primary-font">System</strong> 
            </div>
            <p>` + message + `</p>
        </div>
    </li>`;
    $("#chat").append(newMessage);
    isNextMessageRight = !isNextMessageRight;
}

function userMessage(user, message){
	var position = "";
	if(isNextMessageRight){
		position = "right";
	} else {
		position = "left";
	}
	var newMessage = `<li class="` + position + ` clearfix">
        <div class="chat-body clearfix">
	        <div class="header">
	            <strong class="primary-font">` + user + `</strong> 
            </div>
            <p>` + message + `</p>
        </div>
    </li>`;
    $("#chat").append(newMessage);
    isNextMessageRight = !isNextMessageRight;
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
	var head = $("<p class=\"list-group-item active\">Invitations</p>");
	$("#invitations").append(head);
	$("#users").empty();
	head = $("<p class=\"list-group-item active\">Online players</p>");
	$("#users").append(head);
	$("#waitings").empty();
	head = $("<p class=\"list-group-item active\">Waitings</p>");
	$("#waitings").append(head);
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
	if(shipLocations["one"].length == 4 && shipLocations["two"].length == 3 && shipLocations["three"].length == 2 && shipLocations["four"].length == 1){
		$("#fireButton").css("display", "block");
		$("#doneButton").css("display", "none");

		var boats = document.getElementsByClassName("boat");

		for(var i = 0; i < boats.length; i++) {
			$(boats[i]).draggable( 'disable' );
		}

		$("#tablePanel").css("z-index", "10000");

		socket.emit("map", shipLocations);
	} else {
		// TODO vmi üzenet hogy HELLÓÓÓ
	}
}

function turn(){

	var selected = document.getElementsByClassName("clickedCell")[0];
	var position;
	if(selected != undefined) {

		var xPos = 0;
		var yPos = 0;

		for(var i = 0; i < opponentTableMatrix.length; i++){
			for(var j = 0; j < opponentTableMatrix[i].length; j++){
				if(opponentTableMatrix[i][j] == selected){
					xPos = i;
					yPos = j;
				}
			}
		}

		position = {x: xPos, y: yPos};
		selected.classList.remove("clickedCell");

		// send the shot to the server
		socket.emit("turn", position);
	} else {
		// TODO vmi üzenet hogy HELLÓÓÓ
	}
}

var isChatWindowOpen = false;

function collapseOne(){
	if(!isChatWindowOpen){
		$("#collapseOne").slideDown(500, function(){ isChatWindowOpen = true; });
		$("#collapseOne").css("visibility", "visible");
	} else {
		$("#collapseOne").slideUp(500, function(){ isChatWindowOpen = false; });
	}
	
}

var userTableMatrix = [];
var userTableBoats = [];
var opponentTableMatrix = [];
var fireMatrix = [];

var shipLocations = {
	one: [],
	two: [],
	three: [],
	four: []
}

window.onload = init;

window.onresize = resize;

function init() {
	$("#fireButton").css("display", "none");
	//hideLobbyElements();
	//showGameElements();
	var userTable = document.getElementById("userTable");
	var tableRows = userTable.children[1].children;
	for(var i = 0; i < tableRows.length; i++) {
		var userTableRow = [];
		var userTableCells = tableRows[i].children;
		var tmp = [];
		for(var j = 1; j < userTableCells.length; j++){
			userTableRow.push(userTableCells[j]);
			tmp.push(0);
		}
		userTableMatrix.push(userTableRow);
		userTableBoats.push(tmp);
		userTableRow = [];
		tmp = [];
	}
	
	var opponentTable = document.getElementById("opponentTable");
	var tableRows = opponentTable.children[1].children;
	for(var i = 0; i < tableRows.length; i++) {
		var opponentTableRow = [];
		var opponentTableCells = tableRows[i].children;
		var tmp = [];
		for(var j = 1; j < opponentTableCells.length; j++){
			opponentTableRow.push(opponentTableCells[j]);
			tmp.push(0);
		}
		opponentTableMatrix.push(opponentTableRow);
		fireMatrix.push(tmp);
		opponentTableRow = [];
		tmp = [];
	}

	var boats = document.getElementsByClassName("boat");

	for(var i = 0; i < boats.length; i++) {
		$(boats[i]).draggable({ 
			stop: boatDropped
		});
	}
}

function resize() {
	var boats = document.getElementsByClassName("boat");

	var boatLocations = shipLocations["one"];
	boatLocations = boatLocations.concat(shipLocations["two"]);
	boatLocations = boatLocations.concat(shipLocations["three"]);
	boatLocations = boatLocations.concat(shipLocations["four"]);

	for(var i = 0; i < boats.length; i++) {
		for(var j = 0; j < boatLocations.length; j++) {
			if(boatLocations[j]["id"] == boats[i].id){
				console.log("asd");
				var pos = boatLocations[j]["position"][0];
				var tmpCellRect = userTableMatrix[pos["x"]][pos["y"]].getBoundingClientRect();
				var left = tmpCellRect.left + window.scrollX;
				var top = tmpCellRect.top + window.scrollY;

				boats[i].style.position = "absolute";
				boats[i].style.left = left + "px";
				boats[i].style.top = top + "px";
			}
		}
	}
}

function boatDropped(event, ui) {
	var boat = event.target;
	setBoatPosition(boat);
}

function setBoatPosition(boat) {
	var boatRect = boat.getBoundingClientRect();
	var boatLeft = boatRect.left + window.scrollX;
    var boatTop = boatRect.top + window.scrollY;
    var boatRight = boatRect.right + window.scrollX - 1;
   	var boatBottom = boatRect.bottom + window.scrollY - 1;

	var userTableRect = document.getElementById("userTable").getBoundingClientRect();
	// ez statikus
	userTableLeft = userTableRect.left + window.scrollX + 30;
	// ez statikus
    userTableTop = userTableRect.top + window.scrollY + 30;
    userTableRight = userTableRect.right + window.scrollX;
    userTableBottom = userTableRect.bottom + window.scrollY;
				
	//statikus
	var boatStartX = (boatLeft - userTableLeft) / 31;
	var boatStartY = (boatTop - userTableTop) / 31;
	var boatEndX = ((boatRight - userTableLeft) / 31) - 1;
	var boatEndY = ((boatBottom - userTableTop) / 31) - 1;

	if(boatStartX > -1 && boatStartY > -1 && boatEndX < 10 && boatEndY < 10) {
		boatStartX = Math.round(boatStartX);
		boatStartY = Math.round(boatStartY);
		boatEndX = Math.round(boatEndX);
		boatEndY = Math.round(boatEndY);
		if(boatStartX == -1) {
			boatStartX = boatStartX + 1
			boatEndX = boatEndX + 1
		} else if (boatEndX == 10) {
			boatStartX = boatStartX - 1
			boatEndX = boatEndX - 1
		}

		if(boatStartY == -1) {
			boatStartY = boatStartY + 1
			boatEndY = boatEndY + 1
		} else if (boatEndY == 10) {
			boatStartY = boatStartY - 1
			boatEndY = boatEndY - 1
		}
		if(!isPositionOccupied(boat.id, boatStartX, boatStartY, boatEndX, boatEndY)){
			moveBoatToNewPosition(boat, boatStartX, boatStartY);
			refreshUserTable(true, boat.id, boatStartX, boatStartY, boatEndX, boatEndY);
		} else {
			moveBoatToOriginalPosition(boat);
			refreshUserTable(false, boat.id, boatStartX, boatStartY, boatEndX, boatEndY);
		}
	} else {
		moveBoatToOriginalPosition(boat);
		refreshUserTable(false, boat.id, boatStartX, boatStartY, boatEndX, boatEndY);
	}
}

function moveBoatToNewPosition(boat, x1, y1) {
	var tmpCellRect = userTableMatrix[y1][x1].getBoundingClientRect();
	var left = tmpCellRect.left + window.scrollX;
	var top = tmpCellRect.top + window.scrollY;

	boat.style.position = "absolute";
	boat.style.left = left + "px";
	boat.style.top = top + "px";
}

function moveBoatToOriginalPosition(boat) {
	boat.style.left = "";
	boat.style.top = "";
}

function refreshUserTable(isinput, id, x1, y1, x2, y2) {
	for(var i = 0; i < userTableBoats.length; i++) {
		for(var j = 0; j < userTableBoats[0].length; j++) {
			if(userTableBoats[i][j] == id) {
				userTableBoats[i][j] = 0;
			}
		}
	}
	removeShip(id);
	if(isinput) {
		for(var i = y1; i <= y2; i++) {
			for(var j = x1; j <= x2; j++) {
				userTableBoats[i][j] = id;
			}
		}
		addShip(id, x1, y1, x2, y2);
	}
}

function rotateBoat(caller) {
	var boat = caller.parentElement;
	if(boat.classList.contains("rotated")) {
		boat.classList.remove("rotated");
	} else {
		boat.classList.add("rotated");
	}
	setBoatPosition(boat);
}

function isPositionOccupied(id, x1, y1, x2, y2) {
	for(var i = y1; i <= y2; i++) {
		for(var j = x1; j <= x2; j++) {
			if(userTableBoats[i][j] != 0 && userTableBoats[i][j] != id) {
				return true;
			}
		}
	}
	return false;
}

function removeShip(id) {
	var ships;
	switch(id){
		case "1":
		case "2":
		case "3":
		case "4":
			ships = shipLocations["one"];
			for(var i = 0; i < ships.length; i++){
				if(ships[i]["id"] == id){
					ships.splice(i,1);
				}
			}
			break;
		case "5":
		case "6":
		case "7":
			ships = shipLocations["two"];
			for(var i = 0; i < ships.length; i++){
				if(ships[i]["id"] == id){
					ships.splice(i,1);
				}
			}
			break;
		case "8":
		case "9":
			ships = shipLocations["three"];
			for(var i = 0; i < ships.length; i++){
				if(ships[i]["id"] == id){
					ships.splice(i,1);
				}
			}
			break;
		case "10":
			ships = shipLocations["four"];
			for(var i = 0; i < ships.length; i++){
				if(ships[i]["id"] == id){
					ships.splice(i,1);
				}
			}
			break;
	}
}

function addShip(id, x1, y1, x2, y2) {
	var ship = {id: id, position: []};

	for(var i = y1; i <= y2; i++) {
		for(var j = x1; j <= x2; j++) {
			var pos = {x: i, y: j};
			ship["position"].push(pos);
		}
	}

	switch(id){
		case "1":
		case "2":
		case "3":
		case "4":
			shipLocations["one"].push(ship);
			break;
		case "5":
		case "6":
		case "7":
			shipLocations["two"].push(ship);
			break;
		case "8":
		case "9":
			shipLocations["three"].push(ship);
			break;
		case "10":
			shipLocations["four"].push(ship);
			break;
	}
}

function opponentTableCellClicked(caller) {
	var yPos = 0;
	var xPos = 0;

	for(var i = 0; i < opponentTableMatrix.length; i++){
		for(var j = 0; j < opponentTableMatrix[i].length; j++){
			if(opponentTableMatrix[i][j] == caller){
				yPos = i;
				xPos = j;
			}
		}
	}

	if(fireMatrix[yPos][xPos] == 0) {
		var prevSelected = document.getElementsByClassName("clickedCell")[0];
		if(prevSelected != undefined)
			prevSelected.classList.remove("clickedCell");
		caller.classList.add("clickedCell");
	}
}