<?php
include 'db.php';
if (!isset($_GET['id'])) {
    header('Location: index.php');
    exit;
}
$id = intval($_GET['id']);
$stmt = $conn->prepare("SELECT * FROM service_providers WHERE id = ?");
$stmt->bind_param("i", $id);
$stmt->execute();
$result = $stmt->get_result();
if ($result->num_rows === 0) {
    die("Provider not found.");
}
$provider = $result->fetch_assoc();
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= htmlspecialchars($provider['name']) ?> - Profile</title>
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<section class="providers">
<div class="card-container">
<div class="card">
    <img src="<?= htmlspecialchars($provider['image']) ?>" alt="<?= htmlspecialchars($provider['name']) ?>" style="width:110px; height:110px; border-radius:50%; object-fit:cover;">
    <h2><?= htmlspecialchars($provider['name']) ?></h2>
    <p><?= htmlspecialchars($provider['service']) ?></p>
    <p>
        
<?php
if ($provider['rating'] !== null) {
    $avg = round($provider['rating']);
    echo str_repeat('⭐', $avg) . str_repeat('☆', 5 - $avg);
    echo ' (' . number_format($provider['rating'], 1) . ')';
} else {
    echo 'Not rated yet';
}
?>
</p>

    <p>📍 <?= htmlspecialchars($provider['location']) ?></p>
    <p>📧 <?= $provider['email'] ? htmlspecialchars($provider['email']) : 'Not provided' ?></p>
    <p>📅 Joined: <?= htmlspecialchars($provider['joined_date']) ?></p>
    <a href="tel:<?= htmlspecialchars($provider['phone']) ?>" class="contact" style="display:block; text-decoration:none;">📞 Contact</a>
    <a href="javascript:history.back()">
        <button class="profile">← Go Back</button>
    </a>
</div>
</div>
</section>
<script src="js/script.js"></script>
</body>
</html>