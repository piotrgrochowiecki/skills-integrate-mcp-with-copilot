document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const authBtn = document.getElementById("auth-btn");
  const authUsername = document.getElementById("auth-username");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  const modalCancel = document.getElementById("modal-cancel");

  // ── Auth helpers ──────────────────────────────────────────────────────────

  function getToken() {
    return sessionStorage.getItem("authToken");
  }

  function isLoggedIn() {
    return !!getToken();
  }

  function authHeaders() {
    return { Authorization: `Bearer ${getToken()}` };
  }

  function updateAuthUI() {
    const loggedIn = isLoggedIn();
    const username = sessionStorage.getItem("authUsername");

    if (loggedIn) {
      authBtn.title = "Logout";
      authBtn.textContent = "🔓";
      authUsername.textContent = username;
      authUsername.classList.remove("hidden");
      signupForm.closest("section").classList.remove("hidden");
    } else {
      authBtn.title = "Teacher login";
      authBtn.textContent = "👤";
      authUsername.classList.add("hidden");
      signupForm.closest("section").classList.add("hidden");
    }

    // Update delete button visibility in the rendered activity cards
    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.classList.toggle("hidden", !loggedIn);
    });
  }

  // ── Login / Logout modal ──────────────────────────────────────────────────

  authBtn.addEventListener("click", () => {
    if (isLoggedIn()) {
      handleLogout();
    } else {
      loginModal.classList.remove("hidden");
      document.getElementById("login-username").focus();
    }
  });

  modalCancel.addEventListener("click", () => {
    loginModal.classList.add("hidden");
    loginForm.reset();
    loginError.classList.add("hidden");
  });

  loginModal.addEventListener("click", (e) => {
    if (e.target === loginModal) {
      modalCancel.click();
    }
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.classList.add("hidden");

    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (response.ok) {
        sessionStorage.setItem("authToken", result.token);
        sessionStorage.setItem("authUsername", result.username);
        loginModal.classList.add("hidden");
        loginForm.reset();
        updateAuthUI();
        fetchActivities();
      } else {
        loginError.textContent = result.detail || "Login failed";
        loginError.classList.remove("hidden");
      }
    } catch {
      loginError.textContent = "Could not connect. Please try again.";
      loginError.classList.remove("hidden");
    }
  });

  async function handleLogout() {
    try {
      await fetch("/logout", {
        method: "POST",
        headers: authHeaders(),
      });
    } finally {
      sessionStorage.removeItem("authToken");
      sessionStorage.removeItem("authUsername");
      updateAuthUI();
      fetchActivities();
    }
  }

  // ── Activities ────────────────────────────────────────────────────────────

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn${isLoggedIn() ? "" : " hidden"}" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: authHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // ── Init ──────────────────────────────────────────────────────────────────

  updateAuthUI();
  fetchActivities();
});
