<div class="d-flex justify-content-between mb-3">
  <h5>Employee Records</h5>
</div>
<?php if (!empty($_SESSION['success'])): ?><div class="alert alert-success"><?= e($_SESSION['success']); unset($_SESSION['success']); ?></div><?php endif; ?>
<?php if (!empty($_SESSION['error'])): ?><div class="alert alert-danger"><?= e($_SESSION['error']); unset($_SESSION['error']); ?></div><?php endif; ?>
<div class="row g-4">
  <div class="col-lg-5">
    <div class="card"><div class="card-body">
      <form method="post" action="index.php?action=employees-store" enctype="multipart/form-data">
        <input type="hidden" name="user_id" value="1">
        <input class="form-control mb-2" name="full_name" placeholder="Full Name" required>
        <select class="form-select mb-2" name="gender" required><option value="">Gender</option><option>Male</option><option>Female</option></select>
        <input class="form-control mb-2" name="civil_status" placeholder="Civil Status" required>
        <input class="form-control mb-2" type="date" name="date_of_birth" required>
        <input class="form-control mb-2" type="email" name="email" placeholder="Email" required>
        <input class="form-control mb-2" name="contact_number" placeholder="Contact Number" required>
        <textarea class="form-control mb-2" name="address" placeholder="Address" required></textarea>
        <input class="form-control mb-2" type="date" name="date_hired" required>
        <input class="form-control mb-2" name="employment_status" placeholder="Employment Status" required>
        <input class="form-control mb-2" name="office_id" placeholder="Office ID" required>
        <input class="form-control mb-2" name="position_id" placeholder="Position ID" required>
        <label class="form-label small">Profile Photo</label>
        <input class="form-control mb-2" type="file" name="profile_photo" accept=".jpg,.jpeg,.png">
        <input class="form-control mb-2" name="document_type" placeholder="Document Type (contract, etc.)">
        <input class="form-control mb-3" type="file" name="document" accept=".pdf,.doc,.docx">
        <button class="btn btn-primary w-100">Save Employee</button>
      </form>
    </div></div>
  </div>
  <div class="col-lg-7">
    <div class="table-responsive">
      <table class="table table-striped align-middle">
        <thead><tr><th>Employee ID</th><th>Name</th><th>Office</th><th>Position</th></tr></thead>
        <tbody>
        <?php foreach ($employees as $employee): ?>
          <tr>
            <td><?= e($employee['employee_id']); ?></td>
            <td><?= e($employee['full_name']); ?></td>
            <td><?= e($employee['office_name'] ?? '-'); ?></td>
            <td><?= e($employee['position_name'] ?? '-'); ?></td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>
</div>
