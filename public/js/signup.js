let container = document.getElementById("container");

toggle = () => {
  container.classList.toggle("sign-in");
  container.classList.toggle("sign-up");
};

setTimeout(() => {
  container.classList.add("sign-in");
}, 200);

//form validation

function validateForm() {
	const name = document.getElementById("name").value;
	const email = document.getElementById("email").value;
	const password = document.getElementById("password").value;
	const phone = document.getElementById("phone").value;
  
	const nameError = document.getElementById("name-error");
	const emailError = document.getElementById("email-error");
	const passwordError = document.getElementById("password-error");
	const phoneError = document.getElementById("phone-error");
  
	// Clear previous errors
	nameError.textContent = "";
	emailError.textContent = "";
	passwordError.textContent = "";
	phoneError.textContent = "";
  
	let isValid = true;
  
	// Name validation
	if (name.trim() === "" || /\d/.test(name)) {
	  nameError.textContent = "Please enter your name properly.";
	  isValid = false;
	}
  
	// Email validation
	if (email.trim() === "" || !email.includes("@")) {
	  emailError.textContent = "Please enter a valid email address.";
	  isValid = false;
	}
  
	// Password validation
	if (password.trim() === "" || password.trim().length < 6) {
	  passwordError.textContent =
		"Please enter a password with at least 6 characters.";
	  isValid = false;
	} else {
	  var hasUpperCase = /[A-Z]/.test(password);
	  var hasLowerCase = /[a-z]/.test(password);
	  var hasNumbers = /\d/.test(password);
	  var hasSpecialCharacters = /[!@#\$%\^&\*]/.test(password);
  
	  // Check if all criteria are met
	  if (!hasUpperCase) {
		passwordError.textContent =
		  "Password must contain at least one uppercase letter.";
		isValid = false;
	  } else if (!hasLowerCase) {
		passwordError.textContent =
		  "Password must contain at least one lowercase letter.";
		isValid = false;
	  } else if (!hasNumbers) {
		passwordError.textContent = "Password must contain at least one number.";
		isValid = false;
	  } else if (!hasSpecialCharacters) {
		passwordError.textContent =
		  "Password must contain at least one special character.";
		isValid = false;
	  }
	}
  
	// Phone number validation
	if (phone.trim() === "" || !/^\d{10}$/.test(phone)) {
	  phoneError.textContent = "Please enter a valid 10-digit phone number.";
	  isValid = false;
	}
  
	return isValid;
  }
  