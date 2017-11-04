function postRegistration(){

	var data = {
		username: $("#username").val(),
		password: $("#password").val()
	};

	console.log(data);

	$.post({
		url: "/registration",
		data: JSON.stringify(data),
		dataType: "json",
		contentType: "application/json",
		success: (resp) => {

			if(resp.success){
				console.log("SUCCESSFUL REGISTRATION");
			}else{
				console.log("REGISTRATION FAILED");
				console.log(resp.reason);
			}

		}
	});

}