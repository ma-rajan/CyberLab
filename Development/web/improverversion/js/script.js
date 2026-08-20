const form = document.getElementById("registerForm");
form.addEventListener("submit", function(e) {
    let fullname        = document.getElementById("fullname").value.trim();
    let email           = document.getElementById("email").value.trim();
    let phoneno         = document.getElementById("phoneno").value.trim();
    let password        = document.getElementById("password").value;
    let confirmPassword = document.getElementById("confirmPassword").value;
    let role            = document.getElementById("role").value;
    if (fullname === "") {
        alert("Please enter full name");
        e.preventDefault();
        return;
    }
    if (email === "") {
        alert("Please enter email");
        e.preventDefault();
        return;
    }
    if (phoneno.length !== 10) {
        alert("Please enter a valid phone number");
        e.preventDefault();
        return;
    }
    if (password.length < 8) {
        alert("Password must be at least 8 characters");
        e.preventDefault();
        return;
    }
    if (password !== confirmPassword) {
        alert("Passwords do not match");
        e.preventDefault();
        return;
    }
    if (role === "") {
        alert("Please select a role");
        e.preventDefault();
        return;
    }
});
