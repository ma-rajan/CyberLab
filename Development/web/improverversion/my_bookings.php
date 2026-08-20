<?php
session_start();
include 'db.php';

if (!isset($_SESSION['user_id'])) {
    header('Location: login.php');
    exit;
}

$customer_id = $_SESSION['user_id'];

// Fetch this customer's bookings, with provider info and any existing review
$stmt = $conn->prepare("
    SELECT b.id AS booking_id, b.service_date, b.status,
           sp.id AS provider_id, sp.name AS provider_name, sp.service,
           r.id AS review_id, r.rating, r.review_text
    FROM bookings b
    JOIN service_providers sp ON b.provider_id = sp.id
    LEFT JOIN reviews r ON r.booking_id = b.id
    WHERE b.customer_id = ?
    ORDER BY b.id DESC
");
$stmt->bind_param("i", $customer_id);
$stmt->execute();
$bookings = $stmt->get_result();

// Map status -> badge style + label
$statusMap = [
    'pending'   => ['label' => 'Pending',   'color' => '#f0a500'],
    'confirmed' => ['label' => 'Confirmed', 'color' => '#2d7dd2'],
    'completed' => ['label' => 'Completed', 'color' => '#2e7d32'],
    'cancelled' => ['label' => 'Cancelled', 'color' => '#c62828'],
];
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>My Bookings</title>
<link rel="stylesheet" href="css/style.css">
</head>
<body>

<div style="max-width:900px; margin:30px auto; padding:0 15px;">
    <h1 style="margin-bottom:20px;">My Bookings</h1>

    <?php if ($bookings->num_rows === 0): ?>
        <p>You haven't made any bookings yet.</p>
    <?php else: ?>
        <?php while ($row = $bookings->fetch_assoc()): ?>
            <?php
                $statusInfo = $statusMap[$row['status']] ?? ['label' => $row['status'], 'color' => '#777'];
            ?>
            <div style="border:1px solid #ddd; border-radius:10px; padding:16px 20px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <div>
                    <h3 style="margin:0 0 4px 0;"><?= htmlspecialchars($row['provider_name']) ?></h3>
                    <p style="margin:0; color:#555;"><?= htmlspecialchars($row['service']) ?> &nbsp;|&nbsp; 📅 <?= htmlspecialchars($row['service_date']) ?></p>
                </div>

                <div style="text-align:right;">
                    <span style="display:inline-block; padding:5px 14px; border-radius:20px; color:#fff; font-size:13px; font-weight:600; background:<?= $statusInfo['color'] ?>;">
                        <?= htmlspecialchars($statusInfo['label']) ?>
                    </span>

                    <?php if ($row['status'] === 'completed'): ?>
                        <div style="margin-top:8px;">
                            <?php if ($row['review_id']): ?>
                                <p style="margin:0; font-size:14px;">
                                    Your rating:
                                    <?php
                                        $rating = (int)$row['rating'];
                                        echo str_repeat('⭐', $rating) . str_repeat('☆', 5 - $rating);
                                    ?>
                                </p>
                                <a href="review.php?booking_id=<?= $row['booking_id'] ?>" style="font-size:13px;">Edit Review</a>
                            <?php else: ?>
                                <a href="review.php?booking_id=<?= $row['booking_id'] ?>" class="contact" style="display:inline-block; padding:6px 14px; border-radius:6px; text-decoration:none; background:#2e7d32; color:#fff; font-size:13px;">Leave Review</a>
                            <?php endif; ?>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        <?php endwhile; ?>
    <?php endif; ?>
</div>

<script src="js/script.js"></script>
</body>
</html>