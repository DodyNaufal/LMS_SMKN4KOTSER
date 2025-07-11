document
  .getElementById("forgotPasswordForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("forgotEmail").value;

    try {
      const response = await fetch(
        "https://lmssmkn4kotser-production.up.railway.app/api/users/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();
      alert(data.message);
    } catch (error) {
      console.error("Error:", error);
    }
  });
