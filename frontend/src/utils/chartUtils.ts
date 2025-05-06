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

/**
 * Generates an array of colors for chart visualizations
 * @param count - Number of colors needed
 * @returns Object with backgroundColor and borderColor arrays
 */
export const generateColors = (count: number) => {
  // Base colors palette
  const baseColors = [
    { bg: 'rgba(59, 130, 246, 0.7)', border: 'rgba(59, 130, 246, 1)' }, // Blue
    { bg: 'rgba(16, 185, 129, 0.7)', border: 'rgba(16, 185, 129, 1)' }, // Green
    { bg: 'rgba(245, 158, 11, 0.7)', border: 'rgba(245, 158, 11, 1)' }, // Amber
    { bg: 'rgba(239, 68, 68, 0.7)', border: 'rgba(239, 68, 68, 1)' },   // Red
    { bg: 'rgba(168, 85, 247, 0.7)', border: 'rgba(168, 85, 247, 1)' }, // Purple
    { bg: 'rgba(236, 72, 153, 0.7)', border: 'rgba(236, 72, 153, 1)' }, // Pink
    { bg: 'rgba(132, 204, 22, 0.7)', border: 'rgba(132, 204, 22, 1)' }, // Lime
    { bg: 'rgba(20, 184, 166, 0.7)', border: 'rgba(20, 184, 166, 1)' }, // Teal
  ];

  // If we need more colors than in our base palette, we'll generate them
  const backgroundColor: string[] = [];
  const borderColor: string[] = [];

  for (let i = 0; i < count; i++) {
    if (i < baseColors.length) {
      // Use predefined colors first
      backgroundColor.push(baseColors[i].bg);
      borderColor.push(baseColors[i].border);
    } else {
      // Generate a random color if we need more
      const h = Math.floor(Math.random() * 360); // Random hue
      const s = Math.floor(50 + Math.random() * 30); // Saturation 50-80%
      const l = Math.floor(50 + Math.random() * 20); // Lightness 50-70%
      
      backgroundColor.push(`hsla(${h}, ${s}%, ${l}%, 0.7)`);
      borderColor.push(`hsl(${h}, ${s}%, ${l}%)`);
    }
  }

  return {
    backgroundColor,
    borderColor
  };
};

/**
 * Formats a value for display in a chart label (e.g. shortens large numbers)
 * @param value - The number to format
 * @returns Formatted string representation
 */
export const formatChartValue = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};

/**
 * Gets a color based on a status or value
 * @param status - A string status or numerical value
 * @returns Color values for different statuses
 */
export const getStatusColor = (status: string | number): { bg: string, text: string, border: string } => {
  if (typeof status === 'string') {
    switch (status.toLowerCase()) {
      case 'active':
        return { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40' };
      case 'expired':
        return { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40' };
      case 'delisted':
        return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/40' };
      case 'completed':
        return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/40' };
      default:
        return { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/40' };
    }
  }
  
  // If numeric value (e.g. percentage), return color based on range
  if (status >= 75) {
    return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/40' };
  } else if (status >= 50) {
    return { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40' };
  } else if (status >= 25) {
    return { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40' };
  } else {
    return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/40' };
  }
};