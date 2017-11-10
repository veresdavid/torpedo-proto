function postRegistration(){

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

				// TODO: display success message in a div
				alert("SUCCESSFUL REGISTRATION");

			}else{

				var error = resp.error;

				// TODO: show error in a div or something better than an alertbox
				alert(error);

			}

		}
	});

}

function clearForm(){
	$("#username").val("");
	$("#email").val("");
	$("#password").val("");
	$("#re-password").val("");
}