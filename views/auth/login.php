<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= e(APP_NAME) ?> - Login</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light d-flex align-items-center" style="min-height:100vh;">
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-md-5">
        <div class="card shadow-sm">
          <div class="card-body p-4">
            <h4 class="mb-3">Sign in</h4>
            <?php if (!empty($_SESSION['error'])): ?>
              <div class="alert alert-danger"><?= e($_SESSION['error']); unset($_SESSION['error']); ?></div>
            <?php endif; ?>
            <form method="post" action="index.php?action=login">
              <div class="mb-3"><label class="form-label">Username</label><input class="form-control" name="username" required></div>
              <div class="mb-3"><label class="form-label">Password</label><input type="password" class="form-control" name="password" required></div>
              <button class="btn btn-primary w-100" type="submit">Login</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
