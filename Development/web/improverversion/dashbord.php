<?php
session_start();
$isLoggedIn = isset($_SESSION['user_id']);
$userName   = $isLoggedIn ? ($_SESSION['fullname'] ?? '') : '';
$userRole   = $isLoggedIn ? ($_SESSION['role'] ?? '') : '';
// Generate initials from name
$initials = '';
if ($userName) {
    $words = explode(' ', trim($userName));
    foreach ($words as $word) {
        $initials .= strtoupper(substr($word, 0, 1));
    }
    $initials = substr($initials, 0, 2);
}
?>


<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Home Service Provider Management System</title>
    <link rel="stylesheet" href="css/style.css">     
</head>
<body>

    <!-- NavBar -->
    <nav>
        <div class="navbar">
            <a href="adminlog.php"><img src="icon_logo/HOME.png" alt="icon logo"></a>
            <div class="navelement">
                <a href="#">Home</a>
                <a href="#serviceicon">Services</a>
                <a href="my_bookings.php">Bookings</a>
                <a href="#">About</a>
            </div>
              <div class="Login_Register">
                <?php if ($isLoggedIn): ?>
            <!-- Menu items -->
            <ul class="dropdown-menu" role="none">
            <?php if ($userRole === 'service_provider'): ?>
            <li><a href="provider.php" role="menuitem">My Panel</a></li>
            <?php endif; ?>

            <?php if ($userRole === 'customer'): ?>
            <li><a href="my_bookings.php" role="menuitem">My Bookings</a></li>
            <?php endif; ?>

            <div class="dropdown-divider"></div>
            <li>
                <a href="logout.php" class="logout-btn" role="menuitem">
                    Log Out
                    </a>
                        </li>
                </ul>
                   </div>
                    </div>

                    <!-- Click-outside overlay -->
                    <div class="dropdown-overlay" id="dropdownOverlay"></div>

                <?php else: ?>
                    <!--  Not logged in: show Login / Register  -->
                    <div class="auth-buttons">
                        <a href="login.php" class="btn-login">Login</a>
                        <a href="register.php" class="btn-register">Register</a>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </nav>


<div class="hero">
    <h6>Trusted Services Near You</h6>
    <h1>Find the Best Service Providers</h1>
    <h4>Browse verified professionals for home, education & more</h4>
    <form method="GET" action="search.php">
    <div class="searchbar">
        <input type="text" name="service" placeholder="Search service...">
        <select name="location">
            <option value="" hidden>Locations</option>
            <option value="Padampur kalika-01">Padampur kalika-01</option>
            <option value="Padampur kalika-02">Padampur kalika-02</option>
            <option value="Padampur kalika-03">Padampur kalika-03</option>
            <option value="Padampur kalika-04">Padampur kalika-04</option>
            <option value="Padampur kalika-05">Padampur kalika-05</option>
            <option value="Padampur kalika-06">Padampur kalika-06</option>
            <option value="Padampur kalika-07">Padampur kalika-07</option>
        </select>
        <button type="submit">Search</button>
    </div>
    </form>
</div>


    <!-- Category section -->
    <div class="category">
        <h3>Browse by Category</h3>
        <h5>Choose from our wide range of services</h5>
    </div>

    <div class="serviceicon">
        <a href="electrican.php">
            <div class="service">
                <img src="images/Electrician.png" alt="Electrician"><br>
                <h3>Electrican</h3>
                <h6>Wiring & repairs</h6>
            </div>
        </a>
        <a href="plumber.php">
            <div class="service">
                <img src="images/plumber.png" alt="">
                <h3>Plumber</h3>
                <h6>Pipe & leak fixes</h6>
            </div>
        </a>
        <a href="tutor.php">
            <div class="service">
                <img src="images/tutor.png" alt="">
                <h3>Tutor</h3>
                <h6>Home & online classes</h6>
            </div>
        </a>
        <a href="vaterinarian.php">
            <div class="service">
                <img src="images/veterinarian.png" alt="">
                <h3>Veterinarian</h3>
                <h6>Checkups & Medicine</h6>
            </div>
        </a>
        <a href="panter.php">
            <div class="service">
                <img src="images/painter.png" alt="">
                <h3>Painter</h3>
                <h6>Interior & exterior</h6>
            </div>
        </a>
        <a href="cleaner.php">
            <div class="service">
                <img src="images/cleaner.png" alt="">
                <h3>Cleaner</h3>
                <h6>Home deep cleaning</h6>
            </div>
        </a>
    </div>

    <div class="category">
        <h3>Top Rated Providers</h3>
        <section class="providers">
            <div class="card-container">
                <div class="card">
                    <img src="service provider image/1.jpg" alt="">
                    <h2>Sugish</h2>
                    <p>Plumber</p>
                    <p>⭐⭐⭐⭐☆ 4.9</p>
                    <p>📍 padampur kalika-06</p>
                    <button class="contact">Contact</button>
                    <button class="profile">View Profile</button>
                </div>
                <div class="card">
                    <img src="service provider image/2.jpg" alt="">
                    <h2>Ankit</h2>
                    <p>Electrican</p>
                    <p>⭐⭐⭐⭐☆ 4.8</p>
                    <p>📍 Padampur,kalik-02</p>
                    <button class="contact">Contact</button>
                    <button class="profile">View Profile</button>
                </div>
                <div class="card">
                    <img src="service provider image/3.jpg" alt="">
                    <h2>Kshitiz</h2>
                    <p>Tutor</p>
                    <p>⭐⭐⭐⭐☆ 4.7</p>
                    <p>📍 Padampur, kalika-03</p>
                    <button class="contact">Contact</button>
                    <button class="profile">View Profile</button>
                </div>
            </div>
        </section>
    </div>

    <div class="footer">
        <p>© 2026 BCA Project. All rights reserved.</p>
        <div class="socailmedia">
            <a href="https://mail.google.com/mail/?view=cm&to=rajancdy14@gmail.com" target="_blank">
                <img src="footerImages/email.png" alt="email">
            </a>
            <a href=""><img src="footerImages/instagram.png" alt="instagram"></a>
            <a href=""><img src="footerImages/social.png" alt="facebook"></a>
            <a href=""><img src="footerImages/whatsapp.png" alt="whatsapp"></a>
        </div>
    </div>
    <script src="js/script.js"></script>
</body>
</html>