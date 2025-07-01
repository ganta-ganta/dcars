const adminPassword = "gopanda@99";  // Hardcoded admin password

    document.getElementById('adminLoginForm').addEventListener('submit', function(event) {
      event.preventDefault();
      const enteredPassword = document.getElementById('adminPassword').value;

      if (enteredPassword === adminPassword) {
        localStorage.setItem('isAdminLoggedIn', 'true');
        window.location.href = 'admin-dashboard.html';  // Redirect to the admin dashboard
      } else {
        document.getElementById('loginMessage').innerText = "Incorrect password. I think your not eligble to admin panel.";
      }
    });