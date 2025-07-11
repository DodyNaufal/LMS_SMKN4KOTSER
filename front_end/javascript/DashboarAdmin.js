// Toggle sidebar on mobile
document.getElementById("sidebarToggle").addEventListener("click", function () {
  document.querySelector(".sidebar").classList.toggle("active");
});

// Growth Chart (Students & Teachers)
const growthCtx = document.getElementById("growthChart").getContext("2d");
const growthChart = new Chart(growthCtx, {
  type: "line",
  data: {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
    datasets: [
      {
        label: "Students",
        data: [850, 920, 980, 1020, 1100, 1150, 1248],
        borderColor: "#6366F1",
        backgroundColor: "rgba(99, 102, 241, 0.1)",
        tension: 0.3,
        fill: true,
      },
      {
        label: "Teachers",
        data: [50, 52, 54, 56, 58, 60, 64],
        borderColor: "#3B82F6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.3,
        fill: true,
      },
    ],
  },
  options: {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      tooltip: {
        mode: "index",
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        min: 0,
      },
    },
  },
});

// Program Distribution Chart
const programCtx = document.getElementById("programChart").getContext("2d");
const programChart = new Chart(programCtx, {
  type: "doughnut",
  data: {
    labels: ["TKJ", "RPL", "MM", "AK", "AP"],
    datasets: [
      {
        data: [320, 280, 240, 200, 208],
        backgroundColor: [
          "#6366F1",
          "#3B82F6",
          "#10B981",
          "#F59E0B",
          "#8B5CF6",
        ],
        borderWidth: 0,
      },
    ],
  },
  options: {
    responsive: true,
    plugins: {
      legend: {
        position: "right",
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const label = context.label || "";
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
    cutout: "70%",
  },
});

// Usage Statistics Chart
const usageCtx = document.getElementById("usageChart").getContext("2d");
const usageChart = new Chart(usageCtx, {
  type: "bar",
  data: {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "Logins",
        data: [320, 290, 350, 380, 400, 180, 120],
        backgroundColor: "#6366F1",
        borderRadius: 4,
      },
    ],
  },
  options: {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  },
});
