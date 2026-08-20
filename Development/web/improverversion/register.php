<?php
session_start();
include("db.php");

if ($_SERVER['REQUEST_METHOD'] == "POST" && isset($_POST['create'])) {
    $fullname        = trim($_POST['fullname']);
    $email           = trim($_POST['email']);
    $phoneno         = trim($_POST['phoneno']);
    $password        = $_POST['password'];
    $confirmPassword = $_POST['confirmPassword'];
    $role            = $_POST['role'];

    if (!empty($fullname) && !empty($email) && !empty($phoneno) && !empty($password) && !empty($confirmPassword) && !empty($role)) {
        
        if ($password !== $confirmPassword) {
            echo "<script>alert('Passwords do not match!');</script>";
        } else {
            $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
            $stmt->bind_param("s", $email);
            $stmt->execute();
            $stmt->store_result();

            if ($stmt->num_rows > 0) {
                echo "<script>alert('Email is already registered!');</script>";
            } else {
                $stmt = $conn->prepare("INSERT INTO users (fullname, email, phoneno, password, role) VALUES (?, ?, ?, ?, ?)");
                $stmt->bind_param("sssss", $fullname, $email, $phoneno, $password, $role);

                   if ($stmt->execute()) {
                    $new_user_id = $stmt->insert_id;
                     $_SESSION['user_id'] = $new_user_id;
                     $_SESSION['role'] = $role;

                   if ($role === 'service_provider') {
                header("Location: apply.php?name=" . urlencode($fullname) . "&phone=" . urlencode($phoneno));
               } else {
                 header("Location: login.php");
                  }
                  exit();
                    } else {
                    echo "<script>alert('Something went wrong!');</script>";
                }
            }
        }
    } else {
        echo "<script>alert('Please fill all fields!');</script>";
    }
}
?>



<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Register Page</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
   <form action="register.php" method="post" id="registerForm">
    <div class="register">
        <img src="icon_logo/HOME.png" alt="logo">
        <h3>Create an account</h3>
        <div class="user">
            Full Name 
            <input type="text" name="fullname" id="fullname" placeholder="Your full name">
            Email
            <input type="email" name="email" id="email" placeholder="your@email.com">
            Phone Number
            <input type="text" name="phoneno" id="phoneno" placeholder="phoneno">
            Password
            <input type="password" name="password" id="password" placeholder="Min 8 characters">
            Confirm Password
            <input type="password" name="confirmPassword" id="confirmPassword" placeholder="Min 8 characters">
            Role
            <select name="role" id="role">
                <option value="" hidden>Select role</option>
               <option value="customer">Customer</option>
<option value="service_provider">Service Provider</option>
            </select>
         <button type="submit" id="create" name="create" value="1">Create Account</button>
        </div>
         <div class="dohave">
              <p>Already have an account?</p>
            <a href="login.php">Login</a>
        </div>
    </div>
    </form>
    <script src="js/script.js"></script>
</body>
</html> 