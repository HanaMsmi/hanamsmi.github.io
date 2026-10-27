(function () {
    "use strict";

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    const pages = $$(".page");
    const dotsEl = $("#dots");
    const prevBtn = $("#prev");
    const nextBtn = $("#next");
    const countNow = $("#countNow");
    const baseTitle = document.title;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let current = -1;
    const enterHooks = new Map();
    const leaveHooks = new Map();

    /* ---------- set-up ---------- */

    $("#countTotal").textContent = "/ " + String(pages.length).padStart(2, "0");

    pages.forEach((page, i) => {
        $$(".info > *", page).forEach((el, n) => el.style.setProperty("--i", n));

        const dot = document.createElement("li");
        const btn = document.createElement("button");
        btn.dataset.label = page.dataset.label;
        btn.setAttribute("aria-label", "Go to page " + (i + 1) + ": " + page.dataset.label);
        btn.addEventListener("click", () => goTo(i));
        dot.appendChild(btn);
        dotsEl.appendChild(dot);
    });

    /* ---------- navigation ---------- */

    function goTo(index, opts = {}) {
        index = Math.max(0, Math.min(pages.length - 1, index));
        if (index === current) return;
        const leaving = pages[current];

        pages.forEach((page, i) => {
            page.classList.toggle("is-active", i === index);
            page.classList.toggle("is-past", i < index);
            page.inert = i !== index;
            page.setAttribute("aria-hidden", String(i !== index));
        });

        $$("button", dotsEl).forEach((b, i) => b.setAttribute("aria-current", String(i === index)));
        countNow.textContent = String(index + 1).padStart(2, "0");
        prevBtn.disabled = index === 0;
        nextBtn.disabled = index === pages.length - 1;

        const page = pages[index];
        document.body.dataset.tint = page.dataset.tint || "cream";
        document.body.dataset.ears = page.dataset.ears || "r";
        document.title = index === 0 ? baseTitle : page.dataset.label + " | Hanieh Masoomi";

        if (!opts.fromHash) {
            const hash = "#" + page.dataset.slug;
            if (index === 0) history.replaceState(null, "", location.pathname + location.search);
            else history.replaceState(null, "", hash);
        }

        if (leaving && leaveHooks.has(leaving)) leaveHooks.get(leaving)();
        current = index;
        if (enterHooks.has(page)) enterHooks.get(page)();
        if (leaving) $$("video[data-autoplay]", leaving).forEach((v) => v.pause());
        $$("video[data-autoplay]", page).forEach((v) => {
            const p = v.play();
            if (p && p.catch) p.catch(() => {});
        });
    }

    const next = () => goTo(current + 1);
    const prev = () => goTo(current - 1);

    prevBtn.addEventListener("click", prev);
    nextBtn.addEventListener("click", next);
    $("#home").addEventListener("click", () => goTo(0));
    $$("[data-next]").forEach((b) => b.addEventListener("click", next));

    function fromHash() {
        const slug = location.hash.replace("#", "");
        const i = pages.findIndex((p) => p.dataset.slug === slug);
        return i >= 0 ? i : 0;
    }

    window.addEventListener("hashchange", () => goTo(fromHash(), { fromHash: true }));

    /* keyboard */
    window.addEventListener("keydown", (e) => {
        if (!$("#lightbox").hidden) {
            if (e.key === "Escape") closeLightbox();
            return;
        }
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        if (e.key === " " && (tag === "BUTTON" || tag === "A")) return;

        switch (e.key) {
            case "ArrowRight":
            case "ArrowDown":
            case "PageDown":
            case " ":
                e.preventDefault();
                next();
                break;
            case "ArrowLeft":
            case "ArrowUp":
            case "PageUp":
                e.preventDefault();
                prev();
                break;
            case "Home":
                goTo(0);
                break;
            case "End":
                goTo(pages.length - 1);
                break;
        }
    });

    /* wheel / trackpad: one page per gesture */
    let wheelLocked = false;
    let lastWheel = 0;
    let lockedAt = 0;
    window.addEventListener(
        "wheel",
        (e) => {
            if (!$("#lightbox").hidden) return;
            const page = pages[current];
            if (page.scrollHeight > page.clientHeight + 4 && Math.abs(e.deltaY) > Math.abs(e.deltaX)) return;
            const now = performance.now();
            const gap = now - lastWheel;
            lastWheel = now;

            if (wheelLocked) {
                if (gap > 160 && now - lockedAt > 650) wheelLocked = false;
                else return;
            }
            const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
            if (Math.abs(d) < 24) return;
            wheelLocked = true;
            lockedAt = now;
            d > 0 ? next() : prev();
        },
        { passive: true }
    );

    /* swipe */
    let touch = null;
    window.addEventListener(
        "touchstart",
        (e) => {
            if (e.target.closest("[data-no-swipe]") || e.touches.length > 1) return (touch = null);
            touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        },
        { passive: true }
    );
    window.addEventListener(
        "touchend",
        (e) => {
            if (!touch) return;
            const t = e.changedTouches[0];
            const dx = t.clientX - touch.x;
            const dy = t.clientY - touch.y;
            touch = null;
            if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) dx < 0 ? next() : prev();
        },
        { passive: true }
    );

    /* ---------- lightbox ---------- */

    const lightbox = $("#lightbox");
    const lightboxImg = $("img", lightbox);
    let lastFocus = null;

    function openLightbox(src, alt) {
        lastFocus = document.activeElement;
        lightboxImg.src = src;
        lightboxImg.alt = alt || "";
        lightbox.hidden = false;
        $("button", lightbox).focus();
    }

    function closeLightbox() {
        lightbox.hidden = true;
        lightboxImg.removeAttribute("src");
        if (lastFocus) lastFocus.focus();
    }

    $$("[data-zoom]").forEach((el) =>
        el.addEventListener("click", () => openLightbox(el.dataset.zoom, $("img", el)?.alt))
    );
    lightbox.addEventListener("click", closeLightbox);

    /* ---------- before / after slider ---------- */

    (function () {
        const box = $("#compare");
        const range = $("input", box);
        const set = () => box.style.setProperty("--pos", range.value + "%");
        range.addEventListener("input", set);
        set();

        // a gentle hint the first time the page appears
        enterHooks.set(box.closest(".page"), () => {
            if (reduced || box.dataset.hinted) return;
            box.dataset.hinted = "1";
            let t0 = null;
            const start = 50;
            const run = (t) => {
                if (t0 === null) t0 = t;
                const k = (t - t0) / 1400;
                if (k >= 1 || box.dataset.touched) return;
                range.value = String(start + Math.sin(k * Math.PI * 2) * 22 * (1 - k));
                set();
                requestAnimationFrame(run);
            };
            setTimeout(() => requestAnimationFrame(run), 700);
        });
        ["pointerdown", "keydown"].forEach((ev) => range.addEventListener(ev, () => (box.dataset.touched = "1")));
    })();

    /* ---------- voice assistant ---------- */

    (function () {
        const root = $("#voice");
        const toggle = $("#cacheToggle");
        const said = $(".bubble.said", root);
        const reply = $(".bubble.reply", root);
        const node = (n) => $('[data-n="' + n + '"]', root);
        const wires = $$(".wire", root);
        let timer = null;
        let step = 0;

        function order() {
            const mid = toggle.checked ? "cache" : "llm";
            return [
                { el: said },
                { el: node("stt") },
                { el: wires[0], wire: true },
                { el: node(mid) },
                { el: wires[1], wire: true },
                { el: node("tts") },
                { el: reply },
            ];
        }

        function reset() {
            $$(".on", root).forEach((el) => el.classList.remove("on"));
            node("llm").classList.toggle("skip", toggle.checked);
            node("cache").classList.toggle("skip", !toggle.checked);
            step = 0;
        }

        function tick() {
            const seq = order();
            if (step >= seq.length) {
                timer = setTimeout(() => {
                    reset();
                    tick();
                }, 1600);
                return;
            }
            const item = seq[step];
            if (!item.wire) {
                $$(".node.on", root).forEach((n) => n.classList.remove("on"));
            }
            item.el.classList.add("on");
            step++;
            timer = setTimeout(tick, toggle.checked ? 380 : 720);
        }

        function start() {
            stop();
            reset();
            timer = setTimeout(tick, 500);
        }
        function stop() {
            clearTimeout(timer);
        }

        toggle.addEventListener("change", start);
        const page = root.closest(".page");
        enterHooks.set(page, start);
        leaveHooks.set(page, stop);
    })();

    /* ---------- depression pipeline ---------- */

    (function () {
        const root = $("#lab");
        const tabs = $$("[data-step]", root);
        const scenes = $$("[data-scene]", root);
        const posts = $$("[data-sample]", root);
        const votes = $$("#votes li");
        const verdict = $("#verdict");
        let step = 0;
        let timer = null;
        let manual = false;

        // feature matrix: purely decorative
        const matrix = $("#matrix");
        const palette = ["#e1262d", "#ffc72c", "#7a5443", "#3a2118", "#ff8f87"];
        let seed = 7;
        const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
        const cols = 26;
        const rows = 9;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = document.createElement("i");
                cell.style.setProperty("--c", palette[Math.floor(rnd() * palette.length)]);
                cell.style.setProperty("--o", (0.25 + rnd() * 0.7).toFixed(2));
                cell.style.setProperty("--d", c * 18 + r * 22 + "ms");
                matrix.appendChild(cell);
            }
        }

        // made-up examples, for illustration only
        const samples = [
            { votes: ["d", "d", "n", "d", "d", "d"], text: "5 of 6 models lean depressed" },
            { votes: ["n", "n", "n", "n", "d", "n"], text: "5 of 6 models lean non-depressed" },
        ];

        function show(i) {
            step = i;
            tabs.forEach((t, n) => {
                t.setAttribute("aria-selected", String(n === i));
                t.tabIndex = n === i ? 0 : -1;
            });
            scenes.forEach((s, n) => s.classList.toggle("on", n === i));
            if (i === 4) clearVotes();
        }

        function clearVotes() {
            posts.forEach((p) => p.classList.remove("picked"));
            votes.forEach((v) => v.classList.remove("d", "n"));
            verdict.textContent = "Pick a post";
        }

        function vote(idx) {
            clearVotes();
            posts[idx].classList.add("picked");
            const s = samples[idx];
            verdict.textContent = "…";
            votes.forEach((v, n) =>
                setTimeout(() => {
                    v.classList.add(s.votes[n]);
                }, 220 + n * 170)
            );
            setTimeout(() => (verdict.textContent = s.text), 220 + votes.length * 170);
        }

        function auto() {
            clearTimeout(timer);
            if (manual) return;
            timer = setTimeout(() => {
                if (step < 4) {
                    show(step + 1);
                    auto();
                } else {
                    vote(0);
                }
            }, step === 3 ? 3200 : 2600);
        }

        tabs.forEach((t, n) =>
            t.addEventListener("click", () => {
                manual = true;
                clearTimeout(timer);
                show(n);
            })
        );
        posts.forEach((p, n) =>
            p.addEventListener("click", () => {
                manual = true;
                clearTimeout(timer);
                vote(n);
            })
        );

        const page = root.closest(".page");
        enterHooks.set(page, () => {
            manual = false;
            show(0);
            auto();
        });
        leaveHooks.set(page, () => clearTimeout(timer));
        show(0);
    })();

    /* ---------- go ---------- */

    goTo(fromHash(), { fromHash: true });
})();
