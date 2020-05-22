$(document).ready(function() {
    $("form").submit(function(event) {
        event.preventDefault();
        alert("form is submit");
    })

})
$("form").submit(function(event) {
    event.preventDefault();
    alert("form is submit");
})
