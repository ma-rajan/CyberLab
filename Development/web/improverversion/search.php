<?php
include 'db.php';
$service  = isset($_GET['service'])  ? $conn->real_escape_string(trim($_GET['service']))  : '';
$location = isset($_GET['location']) ? $conn->real_escape_string(trim($_GET['location'])) : '';

$query = "SELECT * FROM service_providers WHERE status = 'approved'";
if (!empty($service)) {
    $query .= " AND service LIKE '%$service%'";
}
if (!empty($location)) {
    $query .= " AND location LIKE '%$location%'";
}
$result = $conn->query($query);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Search Results</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>

<!-- Search bar -->
<div class="hero" style="height:auto; padding:30px 20px;">
    <form method="GET" action="search.php">
        <div class="searchbar">
            <input type="text" name="service" placeholder="Search service..." value="<?= htmlspecialchars($service) ?>">
            <select name="location">
                <option value="" hidden>Locations</option>
                <option value="Padampur kalika-01" <?= $location === 'Padampur kalika-01' ? 'selected' : '' ?>>Padampur kalika-01</option>
                <option value="Padampur kalika-02" <?= $location === 'Padampur kalika-02' ? 'selected' : '' ?>>Padampur kalika-02</option>
                <option value="Padampur kalika-03" <?= $location === 'Padampur kalika-03' ? 'selected' : '' ?>>Padampur kalika-03</option>
                <option value="Padampur kalika-04" <?= $location === 'Padampur kalika-04' ? 'selected' : '' ?>>Padampur kalika-04</option>
                <option value="Padampur kalika-05" <?= $location === 'Padampur kalika-05' ? 'selected' : '' ?>>Padampur kalika-05</option>
                <option value="Padampur kalika-06" <?= $location === 'Padampur kalika-06' ? 'selected' : '' ?>>Padampur kalika-06</option>
                <option value="Padampur kalika-07" <?= $location === 'Padampur kalika-07' ? 'selected' : '' ?>>Padampur kalika-07</option>
            </select>
            <button type="submit">Search</button>
        </div>
    </form>
</div>

<!-- Results -->
<section class="providers">
    <h1>
        <?php if ($service || $location): ?>
            Results for "<?= htmlspecialchars($service) ?>"
            <?= $location ? 'in ' . htmlspecialchars($location) : '' ?>
        <?php else: ?>
            All Providers
        <?php endif; ?>
    </h1>

    <div class="card-container">
        <?php if ($result->num_rows > 0): ?>
            <?php while ($row = $result->fetch_assoc()): ?>
            <div class="card">
                <img src="<?= htmlspecialchars($row['image']) ?>" alt="" style="width:90px; height:90px; border-radius:50%; object-fit:cover;">
                <h2><?= htmlspecialchars($row['name']) ?></h2>
                <p><?= htmlspecialchars($row['service']) ?></p>
                <p><?= htmlspecialchars($row['rating']) ?></p>
                <p>📍 <?= htmlspecialchars($row['location']) ?></p>
                <a href="tel:<?= htmlspecialchars($row['phone']) ?>" class="contact">📞 Contact</a>
                <a href="profile.php?id=<?= $row['id'] ?>">
                    <button class="profile">View Profile</button>
                </a>
            </div>
            <?php endwhile; ?>
        <?php else: ?>
            <p style="text-align:center; color:#555; grid-column:1/-1;">
                No providers found. Try a different search.
            </p>
        <?php endif; ?>
    </div>
</section>
<script src="js/script.js"></script>
</body>
</html>