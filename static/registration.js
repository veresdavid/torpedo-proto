function postRegistration(){
	clearErrorMessages()

	var data = {
		username: $("#username").val(),
		email: $("#email").val(),
		password: $("#password").val(),
		repassword: $("#re-password").val()
	};

	$.post({
		url: "/registration",
		data: JSON.stringify(data),
		dataType: "json",
		contentType: "application/json",
		success: (resp) => {

			if(resp.success){
				
				clearForm();

				$("#successMessage").text("Successful registration");

			}else{

				var error = resp.error;
				switch(error.field){
					case "username":
						$("#usernameErrorMessage").text(error.message);
						break;
					case "email":
						$("#emailErrorMessage").text(error.message);
						break;
					case "password":
						$("#passwordErrorMessage").text(error.message);
						$("#repasswordErrorMessage").text(error.message);
						break;
				}
			}

		}
	});

}

function clearErrorMessages(){
	$("#usernameErrorMessage").text("");
	$("#emailErrorMessage").text("");
	$("#passwordErrorMessage").text("");
	$("#repasswordErrorMessage").text("");
}

function clearForm(){
	$("#username").val("");
	$("#email").val("");
	$("#password").val("");
	$("#re-password").val("");
}