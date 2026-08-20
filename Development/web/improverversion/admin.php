<?php
session_start();
include("db.php");

if (!isset($_SESSION['admin_id'])) {
    header("Location: adminlog.php");
    exit();
}

// Generate a CSRF token once per session
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
$csrf_token = $_SESSION['csrf_token'];

// Handle all state-changing actions (now POST only)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {

    // Verify CSRF token before doing anything
    if (!isset($_POST['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
        http_response_code(403);
        die('Invalid CSRF token.');
    }

    $action = $_POST['action'];
    $id = isset($_POST['id']) ? intval($_POST['id']) : 0;

    switch ($action) {
        case 'delete_user':
            $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            break;

        case 'delete_provider':
            $stmt = $conn->prepare("DELETE FROM service_providers WHERE id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            break;

        case 'delete_booking':
            $stmt = $conn->prepare("DELETE FROM bookings WHERE id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            break;

        case 'confirm_booking':
            $stmt = $conn->prepare("UPDATE bookings SET status = 'confirmed' WHERE id = ? AND status = 'pending'");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            break;

        case 'cancel_booking':
            $stmt = $conn->prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ? AND status = 'pending'");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            break;

        case 'approve_provider':
            $stmt = $conn->prepare("UPDATE service_providers SET status = 'approved' WHERE id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            break;

        case 'reject_provider':
            $stmt = $conn->prepare("UPDATE service_providers SET status = 'rejected' WHERE id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            break;
    }

    header('Location: admin.php');
    exit;
}

// Fetch counts
$user_count_result = $conn->query("SELECT COUNT(*) AS c FROM users");
$user_count = $user_count_result ? $user_count_result->fetch_assoc()['c'] : 0;

$provider_count_result = $conn->query("SELECT COUNT(*) AS c FROM service_providers");
$provider_count = $provider_count_result ? $provider_count_result->fetch_assoc()['c'] : 0;

$booking_count_result = $conn->query("SELECT COUNT(*) AS c FROM bookings");
$booking_count = $booking_count_result ? $booking_count_result->fetch_assoc()['c'] : 0;

// Fetch data
$users     = $conn->query("SELECT * FROM users ORDER BY id DESC");
$providers = $conn->query("SELECT * FROM service_providers ORDER BY id DESC");
$bookings = $conn->query("
    SELECT b.id, b.service_date, b.status, b.created_at,
           u.fullname AS customer_name, u.phoneno AS customer_phone,
           sp.name AS provider_name, sp.service, sp.location, sp.phone AS provider_phone
    FROM bookings b
    JOIN users u ON b.customer_id = u.id
    JOIN service_providers sp ON b.provider_id = sp.id
    ORDER BY b.id DESC
");
?>



<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin Dashboard</title>
<link rel="stylesheet" href="css/style.css">

</head>
<body>
<div class="admin-wrap">

    <div class="admin-header">
        <h1>Admin Dashboard</h1>
        <a href="logout.php" class="btn-logout">Logout</a>
    </div>

    <div class="stats">
        <div class="stat-box"><h2><?php echo $user_count; ?></h2><p>Users</p></div>
        <div class="stat-box"><h2><?php echo $provider_count; ?></h2><p>Providers</p></div>
        <div class="stat-box"><h2><?php echo $booking_count; ?></h2><p>Bookings</p></div>
    </div>

    <!-- USERS -->
    <section>
        <h3>Users</h3>
        <table>
            <tr>
                <th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Action</th>
            </tr>
            <?php while ($row = $users->fetch_assoc()): ?>
            <tr>
                <td><?php echo $row['id']; ?></td>
                <td><?php echo htmlspecialchars($row['fullname'] ?? '-'); ?></td>
                <td><?php echo htmlspecialchars($row['email'] ?? '-'); ?></td>
                <td><?php echo htmlspecialchars($row['phoneno'] ?? '-'); ?></td>
                <td>
                    <form method="POST" action="admin.php" onsubmit="return confirm('Delete this user?')" style="display:inline;">
                        <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrf_token) ?>">
                        <input type="hidden" name="action" value="delete_user">
                        <input type="hidden" name="id" value="<?= $row['id'] ?>">
                        <button type="submit" class="btn-del">Delete</button>
                    </form>
                </td>
            </tr>
            <?php endwhile; ?>
        </table>
    </section>



<!-- PROVIDERS -->
<section>
    <h3>Providers</h3>
    <table>
        <tr>
            <th>ID</th><th>Name</th><th>Service</th><th>Phone</th><th>Location</th><th>Status</th><th>Action</th>
        </tr>
        <?php while ($row = $providers->fetch_assoc()): ?>
        <tr>
            <td><?= $row['id'] ?></td>
            <td><?= htmlspecialchars($row['name'] ?? '-') ?></td>
            <td><?= htmlspecialchars($row['service'] ?? '-') ?></td>
            <td><?= htmlspecialchars($row['phone'] ?? '-') ?></td>
            <td><?= htmlspecialchars($row['location'] ?? '-') ?></td>
            <td>
                <?php
                $status = $row['status'] ?? 'pending';
                $color = $status === 'approved' ? 'green' : ($status === 'rejected' ? 'red' : 'orange');
                echo "<span style='color:$color; font-weight:600;'>" . htmlspecialchars($status) . "</span>";
                ?>
            </td>
            <td>
                <?php if ($row['status'] !== 'approved'): ?>
                    <form method="POST" action="admin.php" onsubmit="return confirm('Approve this provider?')" style="display:inline;">
                        <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrf_token) ?>">
                        <input type="hidden" name="action" value="approve_provider">
                        <input type="hidden" name="id" value="<?= $row['id'] ?>">
                        <button type="submit" style="color:green; background:none; border:none; cursor:pointer; padding:0; margin-right:5px;">✔ Approve</button>
                    </form>
                <?php endif; ?>
                <?php if ($row['status'] !== 'rejected'): ?>
                    <form method="POST" action="admin.php" onsubmit="return confirm('Reject this provider?')" style="display:inline;">
                        <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrf_token) ?>">
                        <input type="hidden" name="action" value="reject_provider">
                        <input type="hidden" name="id" value="<?= $row['id'] ?>">
                        <button type="submit" style="color:orange; background:none; border:none; cursor:pointer; padding:0; margin-right:5px;">✖ Reject</button>
                    </form>
                <?php endif; ?>
                <form method="POST" action="admin.php" onsubmit="return confirm('Delete this provider?')" style="display:inline;">
                    <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrf_token) ?>">
                    <input type="hidden" name="action" value="delete_provider">
                    <input type="hidden" name="id" value="<?= $row['id'] ?>">
                    <button type="submit" class="btn-del">Delete</button>
                </form>
            </td>
        </tr>
        <?php endwhile; ?>
    </table>
</section>


<!-- BOOKINGS -->
<section>
    <h3>Bookings</h3>
    <table>
        <tr>
            <th>ID</th>
            <th>Customer</th>
            <th>Customer Phone</th>
            <th>Provider</th>
            <th>Service</th>
            <th>Location</th>
            <th>Date</th>
            <th>Status</th>
            <th>Action</th>
        </tr>
        <?php while ($row = $bookings->fetch_assoc()): ?>
        <tr>
            <td><?= $row['id'] ?></td>
            <td><?= htmlspecialchars($row['customer_name']) ?></td>
            <td><?= htmlspecialchars($row['customer_phone']) ?></td>
            <td><?= htmlspecialchars($row['provider_name']) ?></td>
            <td><?= htmlspecialchars($row['service']) ?></td>
            <td><?= htmlspecialchars($row['location']) ?></td>
            <td><?= htmlspecialchars($row['service_date']) ?></td>
            <td>
                <?php
                $status = $row['status'];
                $color  = $status === 'confirmed' ? 'green'  :
                         ($status === 'completed' ? 'blue'   :
                         ($status === 'cancelled' ? 'red'    : 'orange'));
                echo "<span style='color:$color; font-weight:600;'>" . htmlspecialchars($status) . "</span>";
                ?>
            </td>
            <td>
                <?php if ($row['status'] === 'pending'): ?>
                    <form method="POST" action="admin.php" style="display:inline;">
                        <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrf_token) ?>">
                        <input type="hidden" name="action" value="confirm_booking">
                        <input type="hidden" name="id" value="<?= $row['id'] ?>">
                        <button type="submit" style="color:green; background:none; border:none; cursor:pointer; padding:0; margin-right:5px;">✔ Confirm</button>
                    </form>
                    <form method="POST" action="admin.php" style="display:inline;">
                        <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrf_token) ?>">
                        <input type="hidden" name="action" value="cancel_booking">
                        <input type="hidden" name="id" value="<?= $row['id'] ?>">
                        <button type="submit" style="color:red; background:none; border:none; cursor:pointer; padding:0; margin-right:5px;">✖ Cancel</button>
                    </form>
                <?php endif; ?>
                <form method="POST" action="admin.php" onsubmit="return confirm('Delete this booking?')" style="display:inline;">
                    <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrf_token) ?>">
                    <input type="hidden" name="action" value="delete_booking">
                    <input type="hidden" name="id" value="<?= $row['id'] ?>">
                    <button type="submit" class="btn-del">Delete</button>
                </form>
            </td>
        </tr>
        <?php endwhile; ?>
    </table>
</section>

</div>
<script src="js/script.js"></script>
</body>
</html>