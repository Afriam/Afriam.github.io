<div class="card">
  <div class="card-body">
    <h5>Leave Application</h5>
    <form method="post" action="index.php?action=leave-store" enctype="multipart/form-data" id="leave-form">
      <input type="hidden" name="employee_id" value="1">
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label">Leave Type</label>
          <select class="form-select" name="leave_type_id" required>
            <option value="">Select</option>
            <?php foreach ($leaveTypes as $type): ?>
              <option value="<?= (int) $type['id']; ?>"><?= e($type['name']); ?></option>
            <?php endforeach; ?>
          </select>
        </div>
        <div class="col-md-3"><label class="form-label">Start Date</label><input class="form-control" type="date" name="start_date" id="start_date" required></div>
        <div class="col-md-3"><label class="form-label">End Date</label><input class="form-control" type="date" name="end_date" id="end_date" required></div>
        <div class="col-md-3"><label class="form-label">Total Days</label><input class="form-control" id="total_days" readonly></div>
        <div class="col-md-9"><label class="form-label">Reason</label><textarea class="form-control" name="reason" required></textarea></div>
        <div class="col-12"><label class="form-label">Supporting Document (Optional)</label><input class="form-control" type="file" name="supporting_document" accept=".pdf,.jpg,.jpeg,.png"></div>
      </div>
      <button class="btn btn-success mt-3" type="submit">Submit Leave</button>
    </form>
  </div>
</div>
<script>
(() => {
  const start = document.getElementById('start_date');
  const end = document.getElementById('end_date');
  const total = document.getElementById('total_days');
  const calc = () => {
    if (!start.value || !end.value) return;
    const s = new Date(start.value);
    const e = new Date(end.value);
    const diff = Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1;
    total.value = diff > 0 ? diff : '';
  };
  start.addEventListener('change', calc);
  end.addEventListener('change', calc);
})();
</script>
