$(document).ready(function(){
	console.log("FASZ");
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

function kek(){
	console.log("KEK");
}

function connect(username, password){

	console.log(username + " - " + password);

}