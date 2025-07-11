// Toggle sidebar on mobile
document.getElementById("sidebarToggle").addEventListener("click", function () {
  document.querySelector(".sidebar").classList.toggle("active");
});

// Initialize charts
document.addEventListener("DOMContentLoaded", function () {
  // Performance Chart
  const performanceCtx = document
    .getElementById("performanceChart")
    .getContext("2d");
  const performanceChart = new Chart(performanceCtx, {
    type: "bar",
    data: {
      labels: [
        "Sangat Baik (90-100)",
        "Baik (80-89)",
        "Cukup (70-79)",
        "Kurang (<70)",
      ],
      datasets: [
        {
          label: "Distribusi Nilai",
          data: [15, 35, 45, 25],
          backgroundColor: [
            "rgba(16, 185, 129, 0.7)",
            "rgba(59, 130, 246, 0.7)",
            "rgba(245, 158, 11, 0.7)",
            "rgba(239, 68, 68, 0.7)",
          ],
          borderColor: [
            "rgba(16, 185, 129, 1)",
            "rgba(59, 130, 246, 1)",
            "rgba(245, 158, 11, 1)",
            "rgba(239, 68, 68, 1)",
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Jumlah Siswa",
          },
        },
        x: {
          title: {
            display: true,
            text: "Kategori Nilai",
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return context.parsed.y + " siswa";
            },
          },
        },
      },
    },
  });

  // File upload interaction
  const uploadArea = document.querySelector(".upload-area");
  if (uploadArea) {
    uploadArea.addEventListener("click", function () {
      // In a real app, this would trigger a file input dialog
      console.log("Upload area clicked");
    });
  }
});
