$(function () {
  $(document).on('click', '.ajax-link', function () {
    const url = $(this).data('url');
    $.get(url + '&ajax=1', function (response) {
      $('#content_id').html(response);
    }).fail(function () {
      Swal.fire('Error', 'Unable to load module.', 'error');
    });
  });
});
