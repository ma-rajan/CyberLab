<?php
session_start();
include("db.php");

if ($_SERVER['REQUEST_METHOD'] == "POST" && isset($_POST['login'])) {
    $username = trim($_POST['username']);
    $email    = trim($_POST['email']);
    $password = trim($_POST['password']);

    if (!empty($username) && !empty($email) && !empty($password)) {

        $stmt = $conn->prepare("SELECT id, username, password FROM admin WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $stmt->store_result();

        if ($stmt->num_rows > 0) {
            $stmt->bind_result($id, $db_username, $db_password);
            $stmt->fetch();

            if ($username === $db_username && $password === $db_password) {

                $_SESSION['admin_id'] = $id;
                $_SESSION['username'] = $username;
                $_SESSION['email']    = $email;

                header("Location: admin.php");
                exit();

            } else {
                echo "<script>alert('Incorrect username or password!');</script>";
            }

        } else {
            echo "<script>alert('Email not found!');</script>";
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
<title>Admin Login Page</title>
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<form action="adminlog.php" method="POST">
<div class="login">
    <img src="icon_logo/HOME.png" alt="logo">
    <h3>Admin Page</h3>
    <h6>Login To Your Account</h6>
    <div class="user">
        Username
        <input type="text" name="username" placeholder="Enter your username">

        Email
        <input type="email" name="email" placeholder="Enter your email">

        Password
        <input type="password" name="password" placeholder="Enter your password">

        <button type="submit" name="login" value="1">Login</button>
    </div>
</div>
</form>
<script src="js/script.js"></script>
</body>
</html>