<?php
session_start();
include 'db.php';

if (!isset($_SESSION['user_id'])) {
    header('Location: login.php');
    exit;
}

$customer_id = $_SESSION['user_id'];
$booking_id  = intval($_GET['booking_id'] ?? $_POST['booking_id'] ?? 0);

// Fetch the booking and confirm it belongs to this customer and is completed
$stmt = $conn->prepare("
    SELECT b.id, b.provider_id, b.status, sp.name AS provider_name
    FROM bookings b
    JOIN service_providers sp ON b.provider_id = sp.id
    WHERE b.id = ? AND b.customer_id = ?
");
$stmt->bind_param("ii", $booking_id, $customer_id);
$stmt->execute();
$booking = $stmt->get_result()->fetch_assoc();

if (!$booking) {
    // Not their booking, or it doesn't exist
    header('Location: my_bookings.php');
    exit;
}

if ($booking['status'] !== 'completed') {
    // Can only review completed bookings
    header('Location: my_bookings.php');
    exit;
}

$provider_id = $booking['provider_id'];
$error = '';

// Check for an existing review (so the form can prefill for editing)
$stmt = $conn->prepare("SELECT * FROM reviews WHERE booking_id = ?");
$stmt->bind_param("i", $booking_id);
$stmt->execute();
$existingReview = $stmt->get_result()->fetch_assoc();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rating      = intval($_POST['rating'] ?? 0);
    $review_text = trim($_POST['review_text'] ?? '');

    if ($rating < 1 || $rating > 5) {
        $error = 'Please select a rating between 1 and 5 stars.';
    } else {
        // Upsert: one review per booking
        $stmt = $conn->prepare("
            INSERT INTO reviews (booking_id, customer_id, provider_id, rating, review_text)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE rating = ?, review_text = ?
        ");
        $stmt->bind_param(
            "iiiisis",
            $booking_id, $customer_id, $provider_id, $rating, $review_text,
            $rating, $review_text
        );
        $stmt->execute();

        // Recalculate and store the provider's average rating
        $stmt = $conn->prepare("SELECT AVG(rating) AS avg_rating FROM reviews WHERE provider_id = ?");
        $stmt->bind_param("i", $provider_id);
        $stmt->execute();
        $avg = $stmt->get_result()->fetch_assoc()['avg_rating'];

        $stmt = $conn->prepare("UPDATE service_providers SET rating = ? WHERE id = ?");
        $stmt->bind_param("di", $avg, $provider_id);
        $stmt->execute();

        header('Location: my_bookings.php');
        exit;
    }
}

$prefillRating = $existingReview['rating'] ?? 0;
$prefillText   = $existingReview['review_text'] ?? '';
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Leave a Review</title>
<link rel="stylesheet" href="css/style.css">
<style>
    .star-rating {
        display: flex;
        flex-direction: row-reverse;
        font-size: 36px;
        justify-content: center;
        gap: 4px;
    }
    .star-rating input { display: none; }
    .star-rating label {
        color: #ccc;
        cursor: pointer;
        transition: color 0.15s;
    }
    .star-rating input:checked ~ label,
    .star-rating label:hover,
    .star-rating label:hover ~ label {
        color: #f0a500;
    }
</style>
</head>
<body>

<div style="max-width:500px; margin:40px auto; padding:25px; border:1px solid #ddd; border-radius:10px;">
    <h2 style="text-align:center;">Review <?= htmlspecialchars($booking['provider_name']) ?></h2>

    <?php if ($error): ?>
        <p style="color:#c62828; text-align:center;"><?= htmlspecialchars($error) ?></p>
    <?php endif; ?>

    <form method="POST" action="review.php?booking_id=<?= $booking_id ?>">
        <input type="hidden" name="booking_id" value="<?= $booking_id ?>">

        <div class="star-rating">
            <?php for ($i = 5; $i >= 1; $i--): ?>
                <input type="radio" id="star<?= $i ?>" name="rating" value="<?= $i ?>"
                    <?= $prefillRating == $i ? 'checked' : '' ?> required>
                <label for="star<?= $i ?>">★</label>
            <?php endfor; ?>
        </div>

        <label style="display:block; margin-top:18px;">Your review</label>
        <textarea name="review_text" rows="5" style="width:100%; padding:10px; border-radius:6px; border:1px solid #ccc;" placeholder="Tell others about your experience..."><?= htmlspecialchars($prefillText) ?></textarea>

        <button type="submit" style="width:100%; margin-top:16px; padding:10px; border-radius:6px; background:#2e7d32; color:#fff; border:none; font-size:15px;">
            <?= $existingReview ? 'Update Review' : 'Submit Review' ?>
        </button>
    </form>

    <p style="text-align:center; margin-top:14px;">
        <a href="my_bookings.php">← Back to My Bookings</a>
    </p>
</div>

<script src="js/script.js"></script>
</body>
</html>