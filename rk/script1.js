function dismissBanner() {
  const banner = document.getElementById('important-note-banner');
  banner.style.display = 'none';
}
// Function to open the banner
function openBanner() {
  document.getElementById('diwaliBanner').style.display = 'flex';
}

// Function to close the banner
function closeBanner() {
  document.getElementById('diwaliBanner').style.display = 'none';
}

// Automatically open the banner when the page loads
window.onload = function() {
  setTimeout(openBanner, 1000); // Opens the banner 1 second after the page loads
}
