function postLogin(){

	var data = {
		username: $("#username").val(),
		password: $("#password").val()
	};

	$.post({
		url: "/login",
		data: JSON.stringify(data),
		dataType: "json",
		contentType: "application/json",
		success: (resp) => {
			
			if(resp.success){

				// redirect to secure page
				window.location.replace("/secure");

			}else{

				$("#errorMessage").text("Invalid username or password!");

			}

		}
	});

}