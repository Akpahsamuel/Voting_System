/**
 * Standard chart color schemes for consistent styling across the application
 * Based on default Chart.js colors (MIT License)
 * Citation: https://github.com/SciLifeLab/genomics-status/blob/33e4a606377e3f7b4637725ce03ffd9373946901/run_dir/static/js/lanes_ordered.js
 */
export const chartColors = {
  // Standard background colors with opacity for charts
  backgroundColors: [
    'rgba(255, 99, 132, 0.5)',   // Red
    'rgba(54, 162, 235, 0.5)',   // Blue
    'rgba(255, 206, 86, 0.5)',   // Yellow
    'rgba(75, 192, 192, 0.5)',   // Green
    'rgba(153, 102, 255, 0.5)'   // Purple
  ],
  
  // Solid border colors for charts
  borderColors: [
    'rgb(255, 99, 132)',
    'rgb(54, 162, 235)',
    'rgb(255, 206, 86)',
    'rgb(75, 192, 192)',
    'rgb(153, 102, 255)'
  ],
  
  // Specific semantic colors
  semantic: {
    yes: 'rgba(75, 192, 92, 0.7)',
    no: 'rgba(255, 99, 132, 0.7)',
    active: 'rgba(54, 162, 235, 0.7)',
    expired: 'rgba(255, 159, 64, 0.7)',
    delisted: 'rgba(201, 203, 207, 0.7)'
  }
};

/**
 * Returns a standard Chart.js options configuration for consistent styling
 */
export const getStandardChartOptions = (isDarkMode: boolean = true) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
        padding: 15,
        usePointStyle: true,
        pointStyle: 'circle'
      }
    }
  },
  scales: {
    y: {
      ticks: { color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)' },
      grid: { color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }
    },
    x: {
      ticks: { color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)' },
      grid: { color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }
    }
  }
});