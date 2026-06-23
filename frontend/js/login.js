const loggedUserText = localStorage.getItem("loggedUser");

if (loggedUserText) {
    window.location.href = "index.html";
}

const showLoginBtn = document.getElementById("showLoginBtn");
const showRegisterBtn = document.getElementById("showRegisterBtn");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

function showLogin() {
    loginForm.style.display = "block";
    registerForm.style.display = "none";

    showLoginBtn.classList.add("active-tab");
    showRegisterBtn.classList.remove("active-tab");
}

function showRegister() {
    loginForm.style.display = "none";
    registerForm.style.display = "block";

    showRegisterBtn.classList.add("active-tab");
    showLoginBtn.classList.remove("active-tab");
}

function saveLoggedUser(user) {
    localStorage.setItem("loggedUser", JSON.stringify(user));
}

showLoginBtn.addEventListener("click", showLogin);
showRegisterBtn.addEventListener("click", showRegister);

document.getElementById("registerBtn").addEventListener("click", async () => {
    const first_name = document.getElementById("firstName").value.trim();
    const last_name = document.getElementById("lastName").value.trim();
    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value;
    const registerMessage = document.getElementById("registerMessage");

    registerMessage.textContent = "";

    const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            first_name,
            last_name,
            username,
            email,
            phone,
            password
        })
    });

    const result = await response.json();

    if (!response.ok) {
        registerMessage.textContent = result.error;
        registerMessage.className = "error-message";
        return;
    }

    registerMessage.textContent = "Регистрацията е успешна. Вече можеш да влезеш.";
    registerMessage.className = "success-message";

    document.getElementById("loginIdentifier").value = username;
    document.getElementById("loginPassword").value = "";

    showLogin();
});

document.getElementById("loginBtn").addEventListener("click", async () => {
    const identifier = document.getElementById("loginIdentifier").value.trim();
    const password = document.getElementById("loginPassword").value;
    const loginMessage = document.getElementById("loginMessage");

    loginMessage.textContent = "";

    const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            identifier,
            password
        })
    });

    const result = await response.json();

    if (!response.ok) {
        loginMessage.textContent = result.error;
        loginMessage.className = "error-message";
        return;
    }

    saveLoggedUser(result.user);

    window.location.href = "index.html";
});