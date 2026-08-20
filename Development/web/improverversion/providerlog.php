<?php
session_start();
include 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['login'])) {
    $email    = trim($_POST['email']);
    $password = $_POST['password'];

    if (!empty($email) && !empty($password)) {

        $stmt = $conn->prepare("SELECT id, fullname, password, role FROM users WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $stmt->store_result();
        $stmt->bind_result($id, $fullname, $db_password, $role);
        $stmt->fetch();

        // NOTE: plain text comparison since the project currently stores
        // plain text passwords. If you switch to password_hash() later,
        // change this to: password_verify($password, $db_password)
        if ($stmt->num_rows > 0 && $password === $db_password && $role === 'service_provider') {

            session_regenerate_id(true);

            $_SESSION['user_id']  = $id;
            $_SESSION['fullname'] = $fullname;
            $_SESSION['role']     = $role;

            header("Location: provider.php");
            exit();

        } else {
            // Same generic message whether the email doesn't exist,
            // the password is wrong, or the account isn't a provider —
            // avoids revealing which case it was.
            echo "<script>alert('Incorrect email or password, or this account is not a service provider.');</script>";
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
<title>Service Provider Login</title>
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<form action="providerlog.php" method="POST">
<div class="login">
    <img src="icon_logo/HOME.png" alt="logo">
    <h3>Service Provider Login</h3>
    <h6>Sign in to manage your bookings</h6>
    <div class="user">
        Email
        <input type="email" name="email" placeholder="Enter your email" required>

        Password
        <input type="password" name="password" placeholder="Enter your password" required>

        <button type="submit" name="login" value="1">Login</button>
    </div>
    <div class="donothave">
        <p>Not a provider yet?</p>
        <a href="register.php">Apply as a Service Provider</a>
    </div>
</div>
</form>
<script src="js/script.js"></script>
</body>
</html>