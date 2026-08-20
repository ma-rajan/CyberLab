<?php
$host = "localhost";
$user = "root";
$pass = "2004";
$db   = "Home_Service_Provider_Management";
$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
?>









