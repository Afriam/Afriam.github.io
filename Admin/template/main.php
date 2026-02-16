<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Dashboard</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
</head>
<body>
<nav class="navbar navbar-expand-lg navbar-dark bg-dark">
  <div class="container-fluid">
    <a class="navbar-brand" href="#">Admin Panel</a>
    <div>
      <button class="btn btn-outline-light btn-sm ajax-link" data-url="index.php?action=employees">Employees</button>
      <button class="btn btn-outline-light btn-sm ajax-link" data-url="index.php?action=leave-create">Leave Form</button>
      <a class="btn btn-danger btn-sm" href="index.php?action=logout">Logout</a>
    </div>
  </div>
</nav>
<div class="container py-4" id="content_id">
  <?php include BASE_PATH . '/Admin/Dashboard/index.php'; ?>
</div>
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="assets/js/app.js"></script>
</body>
</html>
