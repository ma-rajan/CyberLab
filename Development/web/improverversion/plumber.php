<?php
include 'db.php';
$result = $conn->query("SELECT * FROM service_providers WHERE service = 'Plumber' AND status = 'approved'");?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Plumber</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
<section class="providers">
    <h1>Plumber Providers</h1>
    <div class="card-container">
        <?php while ($row = $result->fetch_assoc()): ?>
        <div class="card">
            <img src="<?= htmlspecialchars($row['image']) ?>" alt="">
            <h2><?= htmlspecialchars($row['name']) ?></h2>
            <p><?= htmlspecialchars($row['service']) ?></p>

                    <p>
                <?php
                if ($row['rating'] !== null) {
                    $avg = round($row['rating']);
                    echo str_repeat('⭐', $avg) . str_repeat('☆', 5 - $avg);
                    echo ' (' . number_format($row['rating'], 1) . ')';
                } else {
                    echo 'Not rated yet';
                }
                ?>
         </p>
         
            <p>📍 <?= htmlspecialchars($row['location']) ?></p>

             <a href="book.php?id=<?= $row['id'] ?>">
                <button class="contact">📋 Book</button>
            </a>
            <a href="profile.php?id=<?= $row['id'] ?>">
                <button class="profile">View Profile</button>
            </a>
        </div>
        <?php endwhile; ?>
    </div>
</section>
<script src="js/script.js"></script>
</body>
</html>