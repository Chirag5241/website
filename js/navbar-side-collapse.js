document.addEventListener("DOMContentLoaded", function () {
    const blogLink = document.getElementById("blog-page");
    blogLink?.addEventListener("click", () => {
      sessionStorage.setItem("triggerCollapse", "true");
    });
  });