<?php
session_start();
include 'db.php';

if (!isset($_SESSION['user_id'])) {
    header('Location: login.php');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user_id = intval($_SESSION['user_id']);

    if ($user_id <= 0) {
        // Should never happen given the login check above, but guard anyway
        // so a NULL/0 user_id can never reach the database.
        die('Invalid session. Please log in again.');
    }

    $name     = trim($_POST['name']);
    $service  = trim($_POST['service']);
    $location = trim($_POST['location']);
    $phone    = trim($_POST['phone']);
    $rating   = null; // no rating yet — display pages check for NULL and show "Not rated yet"
    $image    = 'service_provider_image/default.jpg';

    $error = '';

    if (isset($_FILES['image']) && $_FILES['image']['error'] === 0) {
    $allowed   = ['jpg', 'jpeg', 'png', 'gif'];
    $ext       = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));
    $maxSizeMB = 5;

    if (!in_array($ext, $allowed)) {
        $error = 'Only JPG, JPEG, PNG, GIF allowed!';
    } elseif ($_FILES['image']['size'] > $maxSizeMB * 1024 * 1024) {
        $error = 'Image must be smaller than ' . $maxSizeMB . 'MB!';
    } else {
        $imageInfo = getimagesize($_FILES['image']['tmp_name']);
        if ($imageInfo === false) {
            $error = 'Uploaded file is not a valid image!';
        }
        // Don't move the file yet — wait until we have the row's id
    }
} else {
    $error = 'Please upload a profile picture.';
}

if ($error !== '') {
    echo "<script>alert(" . json_encode($error) . ");</script>";
} elseif (empty($name) || empty($service) || empty($location) || empty($phone)) {
    echo "<script>alert('Please fill all fields!');</script>";
} else {
    $checkStmt = $conn->prepare("SELECT id FROM service_providers WHERE user_id = ?");
    $checkStmt->bind_param("i", $user_id);
    $checkStmt->execute();
    $existing = $checkStmt->get_result()->fetch_assoc();

    if ($existing) {
        $provider_id = $existing['id'];

        // Move file now using existing id
        $filename   = $provider_id . '.' . $ext;
        $uploadPath = 'service_provider_image/' . $filename;
        move_uploaded_file($_FILES['image']['tmp_name'], $uploadPath);
        $image = $uploadPath;

        $stmt = $conn->prepare(
            "UPDATE service_providers SET name = ?, service = ?, location = ?, phone = ?, image = ?, status = 'pending' WHERE user_id = ?"
        );
        $stmt->bind_param("sssssi", $name, $service, $location, $phone, $image, $user_id);
        $stmt->execute();
    } else {
        // Insert first with placeholder image, to get the new id
        $stmt = $conn->prepare(
            "INSERT INTO service_providers (user_id, name, service, location, phone, rating, image, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')"
        );
        $placeholder = 'service_provider_image/default.jpg';
        $stmt->bind_param("issssss", $user_id, $name, $service, $location, $phone, $rating, $placeholder);
        $stmt->execute();

        $provider_id = $conn->insert_id; // the new auto-increment id

        // Now move the file using that id
        $filename   = $provider_id . '.' . $ext;
        $uploadPath = 'service_provider_image/' . $filename;
        move_uploaded_file($_FILES['image']['tmp_name'], $uploadPath);
        $image = $uploadPath;

        // Update the row with the real image path
        $update = $conn->prepare("UPDATE service_providers SET image = ? WHERE id = ?");
        $update->bind_param("si", $image, $provider_id);
        $update->execute();
    }

    echo "<script>alert('Application submitted! Wait for admin approval.'); window.location='login.php';</script>";
    exit;
}
}

$prefill_name  = isset($_GET['name'])  ? htmlspecialchars($_GET['name'])  : '';
$prefill_phone = isset($_GET['phone']) ? htmlspecialchars($_GET['phone']) : '';
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Apply as Service Provider</title>
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<form action="apply.php" method="POST" enctype="multipart/form-data">
<div class="register">
<img src="icon_logo/HOME.png" alt="logo">
<h3>Service Provider Application</h3>
<div class="user">
        Full Name
<input type="text" name="name" placeholder="Your full name" value="<?= $prefill_name ?>" required>
        Service Type
<select name="service" required>
<option value="" hidden>Select Service</option>
<option value="Plumber">Plumber</option>
<option value="Electrician">Electrician</option>
<option value="Tutor">Tutor</option>
<option value="Veterinarian">Veterinarian</option>
<option value="Painter">Painter</option>
<option value="Cleaner">Cleaner</option>
</select>
        Location
<input type="text" name="location" placeholder="Your location" required>
        Phone Number
<input type="text" name="phone" placeholder="Your phone number" value="<?= $prefill_phone ?>" required>
        Profile Picture
<input type="file" name="image" accept="image/*" required>
<button type="submit">Submit Application</button>
</div>
<div class="dohave">
<p>Already applied?</p>
<a href="login.php">Login</a>
</div>
</div>
</form>
<script src="js/script.js"></script>
</body>
</html>