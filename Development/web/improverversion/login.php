<?php
session_start();
include("db.php");

if ($_SERVER['REQUEST_METHOD'] == "POST" && isset($_POST['login'])) {
    $email    = trim($_POST['email']);
    $password = $_POST['password'];

    if (!empty($email) && !empty($password)) {

        // Step 1: Check if email exists
        $stmt = $conn->prepare("SELECT id, fullname, password, role FROM users WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $stmt->store_result();
        $stmt->bind_result($id, $fullname, $db_password, $role);
        $stmt->fetch();

        if ($stmt->num_rows > 0 && $password === $db_password) {

            // Step 2: Save user info in session
            $_SESSION['user_id']  = $id;
            $_SESSION['fullname'] = $fullname;
            $_SESSION['role']     = $role;

        
            if ($role == "customer") {
                header("Location: dashbord.php");
                exit();
            } else if ($role == "service_provider") {
                header("Location: dashbord.php");
                exit();
            }

        } else {
            echo "<script>alert('Invalid email or password!');</script>";
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
    <title>Login Page</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>

<form action="login.php" method="POST">
     <div class="login">
        <img src="icon_logo/HOME.png" alt="logo">
        <h3>Welcome back </h3>
        <h6>Sign in to your account</h6>
        <div class="user">
            Email
            <input type="email" name="email" placeholder="Enter your email">
            Password
            <input type="password" name="password" placeholder="Enter your password">
        <button type="submit" name="login" value="1">Login</button>
           
        </div>
        <div class="donothave">
              <p>Don't have an account?</p>
            <a href="register.php">Register</a>
        </div>
       
    </div>
</form>
<script src="js/script.js"></script>
</body>
</html>