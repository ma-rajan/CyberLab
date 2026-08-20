<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
session_start();
include 'db.php';

// Must be logged in to book
if (!isset($_SESSION['user_id'])) {
    header('Location: login.php');
    exit;
}

$id = intval($_GET['id']);
$provider = $conn->query("SELECT * FROM service_providers WHERE id = $id")->fetch_assoc();

if (!$provider) {
    header('Location: index.php');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $customer_id = $_SESSION['user_id'];
    $provider_id = intval($_POST['provider_id']);
    $date        = $conn->real_escape_string($_POST['date']);

    $conn->query("INSERT INTO bookings (customer_id, provider_id, service_date, status) 
                  VALUES ('$customer_id', '$provider_id', '$date', 'pending')");

    echo "<script>alert('Booking submitted successfully! Wait for admin confirmation.'); window.location='my_bookings.php';</script>";
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Book Service</title>
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<form method="POST" action="book.php?id=<?= $id ?>">
<div class="register">
    <img src="icon_logo/HOME.png" alt="logo">
    <h3>Book <?= htmlspecialchars($provider['name']) ?></h3>
    <p style="text-align:center; color:#555; margin-bottom:10px;">
        <?= htmlspecialchars($provider['service']) ?> — 
        📍 <?= htmlspecialchars($provider['location']) ?>
    </p>
    <div class="user">
        <input type="hidden" name="provider_id" value="<?= $id ?>">
        Select Date
        <input type="date" name="date" required min="<?= date('Y-m-d') ?>">
        <button type="submit">Confirm Booking</button>
    </div>
    <div class="dohave">
        <a href="javascript:history.back()">← Go Back</a>
    </div>
</div>
</form>
<script src="js/script.js"></script>
</body>
</html>