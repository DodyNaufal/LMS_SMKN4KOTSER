document
  .getElementById("resetPasswordForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById("newPassword").value;
    const token = window.location.pathname.split("/").pop();

    try {
      const response = await fetch(
        `https://lmssmkn4kotser-production.up.railway.app/api/users/update-password/${token}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ newPassword }),
        }
      );

      const data = await response.json();
      alert(data.message);
    } catch (error) {
      console.error("Error:", error);
    }
  });
