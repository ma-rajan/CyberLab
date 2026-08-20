<?php
session_start();
include 'db.php';

// Must be logged in
if (!isset($_SESSION['user_id'])) {
    header('Location: login.php');
    exit;
}

$user_id = $_SESSION['user_id'];

// Look up this user's provider row
$stmt = $conn->prepare("SELECT * FROM service_providers WHERE user_id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$provider = $stmt->get_result()->fetch_assoc();

if (!$provider) {
    // No provider row for this account yet — send them straight to
    // apply.php so they can submit/resubmit. apply.php now safely
    // updates an existing row instead of creating duplicates, so this
    // is always a safe, self-resolving redirect.
    header('Location: provider.php');
    exit;
}

$provider_id = $provider['id'];

// Handle the bookings password gate
$bookingsError = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['unlock_bookings'])) {
    $enteredPassword = $_POST['confirm_password'] ?? '';

    $stmt = $conn->prepare("SELECT password FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();

    // NOTE: plain text comparison — switch to password_verify() if you
    // move to password_hash() later.
    if ($row && $enteredPassword === $row['password']) {
        $_SESSION['bookings_unlocked'] = true;
    } else {
        $bookingsError = 'Incorrect password.';
    }
}

$bookingsUnlocked = isset($_SESSION['bookings_unlocked']) && $_SESSION['bookings_unlocked'] === true;

// Handle profile update
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['update_profile'])) {
    $service  = trim($_POST['service']);
    $location = trim($_POST['location']);

    if (!empty($service) && !empty($location)) {
        $stmt = $conn->prepare("UPDATE service_providers SET service = ?, location = ? WHERE id = ?");
        $stmt->bind_param("ssi", $service, $location, $provider_id);
        $stmt->execute();

        $provider['service']  = $service;
        $provider['location'] = $location;
    }
}

// Handle booking status change (confirm / cancel / complete)
if ($bookingsUnlocked && isset($_GET['booking_id']) && isset($_GET['status_action'])) {
    $booking_id = intval($_GET['booking_id']);
    $action     = $_GET['status_action'];

    $allowedTransitions = [
        'confirmed' => 'pending',
        'cancelled' => 'pending',
        'completed' => 'confirmed',
    ];

    if (array_key_exists($action, $allowedTransitions)) {
        $requiredCurrentStatus = $allowedTransitions[$action];

        $stmt = $conn->prepare(
            "UPDATE bookings SET status = ? WHERE id = ? AND provider_id = ? AND status = ?"
        );
        $stmt->bind_param("siis", $action, $booking_id, $provider_id, $requiredCurrentStatus);
        $stmt->execute();
    }

    header('Location: provider.php');
    exit;
}

// Fetch this provider's bookings
$stmt = $conn->prepare("
    SELECT b.id, b.customer_id, b.service_date, b.status, u.fullname AS customer_name
    FROM bookings b
    JOIN users u ON b.customer_id = u.id
    WHERE b.provider_id = ?
    ORDER BY b.id DESC
");
$stmt->bind_param("i", $provider_id);
$stmt->execute();
$bookings = $stmt->get_result();
?>


<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Provider Dashboard</title>
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<div class="panel-wrap">

    <div class="panel-header">
        <h1>Provider Dashboard</h1>
        <a href="logout.php" class="btn-logout">Logout</a>
    </div>

    <div class="panel-box">
        <h3>My Profile</h3>
        <form method="POST">
            <label>Name</label>
            <input type="text" value="<?php echo htmlspecialchars($provider['name'] ?? ''); ?>" disabled>

            <label>Service</label>
            <input type="text" name="service" value="<?php echo htmlspecialchars($provider['service'] ?? ''); ?>" placeholder="e.g. Plumber, Electrician" required>

            <label>Location</label>
            <input type="text" name="location" value="<?php echo htmlspecialchars($provider['location'] ?? ''); ?>" required>

            <label>Status</label>
            <input type="text" value="<?php echo htmlspecialchars($provider['status'] ?? ''); ?>" disabled>
            <p class="hint-text">Approval status is set by the admin and can't be changed here.</p>

            <button type="submit" name="update_profile">Update Profile</button>
        </form>
    </div>

    <section>
        <h3>My Bookings</h3>

        <?php if (!$bookingsUnlocked): ?>
            <div class="panel-box panel-box-narrow">
                <p>For your security, please re-enter your password to view bookings.</p>
                <?php if ($bookingsError !== ''): ?>
                    <p class="error-text"><?= htmlspecialchars($bookingsError) ?></p>
                <?php endif; ?>
                <form method="POST">
                    <label>Password</label>
                    <input type="password" name="confirm_password" required>
                    <button type="submit" name="unlock_bookings">Unlock Bookings</button>
                </form>
            </div>
        <?php else: ?>
            <table class="admin-table">
                <tr>
                    <th>ID</th><th>Customer</th><th>Date</th><th>Status</th><th>Action</th>
                </tr>
                <?php if ($bookings->num_rows > 0): ?>
                    <?php while ($row = $bookings->fetch_assoc()): ?>
                    <tr>
                        <td><?php echo $row['id']; ?></td>
                        <td><?php echo htmlspecialchars($row['customer_name'] ?? '-'); ?></td>
                        <td><?php echo htmlspecialchars($row['service_date']); ?></td>
                        <td><?php echo htmlspecialchars($row['status']); ?></td>
                        <td>
                            <?php if ($row['status'] === 'pending'): ?>
                                <a class="btn-approve" href="?booking_id=<?php echo $row['id']; ?>&status_action=confirmed" onclick="return confirm('Confirm this booking?')">Confirm</a>
                                <a class="btn-reject" href="?booking_id=<?php echo $row['id']; ?>&status_action=cancelled" onclick="return confirm('Cancel this booking?')">Cancel</a>
                            <?php elseif ($row['status'] === 'confirmed'): ?>
                                <a class="btn-complete" href="?booking_id=<?php echo $row['id']; ?>&status_action=completed" onclick="return confirm('Mark this booking completed?')">Mark Completed</a>
                            <?php else: ?>
                                -
                            <?php endif; ?>
                        </td>
                    </tr>
                    <?php endwhile; ?>
                <?php else: ?>
                    <tr><td colspan="5">No bookings yet.</td></tr>
                <?php endif; ?>
            </table>
        <?php endif; ?>
    </section>

</div>
<script src="js/script.js"></script>
</body>
</html>