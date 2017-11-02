var socket = io("http://localhost:3000");

socket.on("authenticate", function(){
	socket.emit("authenticate", secret);
});

socket.on("auth_success", () => {
	alert("SUCCESS!!!");
});

socket.on("disconnect", () => {
	console.log("BYE BYE");
});

// TODO: dont forget to pong server!!!
socket.on("ping", () => {
	socket.emit("pong");
});

function postLogin(){

	var data = {
		username: $("#username").val(),
		password: $("#password").val()
	};

	console.log(data);

	$.post({
		url: "/login",
		data: JSON.stringify(data),
		dataType: "json",
		contentType: "application/json",
		success: (resp) => {
			console.log("RESPONSE");
			console.log(resp);
		}
	});

}

function connect(username, password){
	console.log(username + " - " + password);
}