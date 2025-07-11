function togglePassword() {
  const passwordInput = document.getElementById("loginPassword");
  const toggleIcon = document.querySelector(".toggle-password");

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    toggleIcon.textContent = "🙈"; // Ikon mata tertutup
  } else {
    passwordInput.type = "password";
    toggleIcon.textContent = "👁️"; // Ikon mata terbuka
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      const email = document.getElementById("loginEmail").value;
      const password = document.getElementById("loginPassword").value;

      const response = await fetch("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (response.ok) {
        alert("Login berhasil!");
        window.location.href = "dashboard.html";
      } else {
        alert(result.message || "Login gagal, periksa kembali data Anda.");
      }
    });
  }
});
