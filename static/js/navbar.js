document.addEventListener("DOMContentLoaded", function() {
    const toggle = document.getElementById("navToggle");
    const left = document.getElementById("navLeft");
    const right = document.getElementById("navRight");

    if (!toggle) return;

    toggle.addEventListener("click", function() {
        left.classList.toggle("show");
        right.classList.toggle("show");
    });
});

  // Auto-hide flash messages after 3 seconds
  setTimeout(() => {
    const messages = document.querySelectorAll('.flash-message');
    messages.forEach(msg => {
      msg.style.opacity = '0';
      setTimeout(() => msg.remove(), 300);
    });
  }, 3000);
