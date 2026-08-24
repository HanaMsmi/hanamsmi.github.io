(function () {
    "use strict";

    const nav = document.getElementById("nav");
    const navLinks = document.getElementById("navLinks");
    const navToggle = document.getElementById("navToggle");
    const progress = document.querySelector("[data-progress]");
    const links = Array.from(navLinks.querySelectorAll("a"));
    const sections = links
        .map((link) => document.querySelector(link.getAttribute("href")))
        .filter(Boolean);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function onScroll() {
        const y = window.scrollY;
        nav.classList.toggle("stuck", y > 12);

        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.width = (scrollable > 0 ? (y / scrollable) * 100 : 0) + "%";

        const marker = y + window.innerHeight * 0.32;
        let current = sections[0];
        for (const section of sections) {
            if (section.offsetTop <= marker) current = section;
        }
        links.forEach((link) => {
            link.classList.toggle("active", current && link.getAttribute("href") === "#" + current.id);
        });
    }

    let ticking = false;
    window.addEventListener(
        "scroll",
        () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                onScroll();
                ticking = false;
            });
        },
        { passive: true }
    );
    onScroll();

    navToggle.addEventListener("click", () => {
        const open = navLinks.classList.toggle("open");
        navToggle.setAttribute("aria-expanded", String(open));
    });

    navLinks.addEventListener("click", (event) => {
        if (event.target.closest("a")) {
            navLinks.classList.remove("open");
            navToggle.setAttribute("aria-expanded", "false");
        }
    });

    const revealables = document.querySelectorAll("[data-reveal]");
    if (reducedMotion || !("IntersectionObserver" in window)) {
        revealables.forEach((el) => el.classList.add("in-view"));
    } else {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add("in-view");
                    observer.unobserve(entry.target);
                });
            },
            { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
        );
        revealables.forEach((el, index) => {
            el.style.transitionDelay = (index % 4) * 70 + "ms";
            observer.observe(el);
        });
    }

    if (!reducedMotion && window.matchMedia("(hover: hover)").matches) {
        document.querySelectorAll("[data-tilt]").forEach((card) => {
            card.addEventListener("pointermove", (event) => {
                const rect = card.getBoundingClientRect();
                card.style.setProperty("--mx", event.clientX - rect.left + "px");
                card.style.setProperty("--my", event.clientY - rect.top + "px");
            });
        });
    }

    document.getElementById("year").textContent = String(new Date().getFullYear());
})();
