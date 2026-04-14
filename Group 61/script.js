const classesBtn = document.getElementById("nav-classes");
const dropdown = document.getElementById("classDropdown");

classesBtn.addEventListener("click", () => {
    if (dropdown.style.display === "flex") {
        dropdown.style.display = "none";
    } else {
        dropdown.style.display = "flex";
    }
});

// Optional: close when clicking outside
document.addEventListener("click", (e) => {
    if (!classesBtn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = "none";
    }
});
