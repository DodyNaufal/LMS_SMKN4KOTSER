const ctx = document.getElementById("performanceChart").getContext("2d");
const performanceChart = new Chart(ctx, {
  type: "line",
  data: {
    labels: ["Jan", "Feb", "Mar", "Apr", "Mei"],
    datasets: [
      {
        label: "Pemrograman Web",
        data: [75, 78, 82, 80, 85],
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.3,
        fill: true,
      },
      {
        label: "Jaringan Komputer",
        data: [70, 72, 75, 76, 78],
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        tension: 0.3,
        fill: true,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          boxWidth: 12,
          padding: 20,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        min: 60,
        max: 100,
        ticks: {
          stepSize: 10,
        },
      },
    },
  },
});

// Calendar day click event
document.querySelectorAll(".calendar-day").forEach((day) => {
  day.addEventListener("click", function () {
    document.querySelectorAll(".calendar-day").forEach((d) => {
      d.classList.remove("active-day");
      d.classList.add("text-gray-900");
    });
    this.classList.add("active-day");
    this.classList.remove("text-gray-900");
  });
});
