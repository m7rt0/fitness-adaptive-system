function getLoggedUser() {
    const userText = localStorage.getItem("loggedUser");

    if (!userText) {
        window.location.href = "/";
        return null;
    }

    return JSON.parse(userText);
}

function getLoggedUserId() {
    const user = getLoggedUser();

    if (!user) {
        return null;
    }

    return user.id;
}

function logoutUser() {
    localStorage.removeItem("loggedUser");
    window.location.href = "/";
}

document.addEventListener("DOMContentLoaded", () => {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", logoutUser);
    }
});