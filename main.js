(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = typeof window.gsap !== "undefined";
  const hasAnime = typeof window.anime !== "undefined";

  // If anime.js didn't load, show the hero immediately instead of leaving it hidden
  if (!hasAnime) document.documentElement.classList.remove("intro");

  /* ------------------------------------------------------------------
   * 1. Build the blossoms on the hero branch (SVG)
   * ------------------------------------------------------------------ */
  const SVG_NS = "http://www.w3.org/2000/svg";
  const blossomSpots = [
    [60, 92, 1.1], [112, 148, 0.8], [86, 138, 0.7], [232, 130, 1.0],
    [196, 196, 0.75], [150, 232, 0.9], [262, 300, 0.85], [300, 362, 1.15],
    [370, 288, 0.8], [422, 232, 1.05], [338, 396, 0.7], [470, 332, 0.95],
    [430, 402, 0.75], [176, 150, 0.6], [400, 260, 0.6],
  ];
  const blossomGroup = document.querySelector(".blossoms");

  function makeBlossom([x, y, scale], i) {
    const outer = document.createElementNS(SVG_NS, "g");
    outer.setAttribute("class", "blossom");
    outer.setAttribute("transform", `translate(${x} ${y}) scale(${scale})`);

    const inner = document.createElementNS(SVG_NS, "g");
    inner.setAttribute("class", "blossom-inner");

    const alt = i % 3 === 0;
    for (let p = 0; p < 5; p++) {
      const petal = document.createElementNS(SVG_NS, "path");
      // A sakura petal with the characteristic notch at its tip
      petal.setAttribute(
        "d",
        "M0 0 C -11 -6, -13 -18, -6 -25 L 0 -21 L 6 -25 C 13 -18, 11 -6, 0 0 Z"
      );
      petal.setAttribute("class", alt ? "petal alt" : "petal");
      petal.setAttribute("transform", `rotate(${p * 72 + (i * 17) % 72})`);
      inner.appendChild(petal);
    }
    const core = document.createElementNS(SVG_NS, "circle");
    core.setAttribute("r", "3.6");
    core.setAttribute("class", "core");
    inner.appendChild(core);
    for (let s = 0; s < 5; s++) {
      const a = (s * 72 + 36) * (Math.PI / 180);
      const dot = document.createElementNS(SVG_NS, "circle");
      dot.setAttribute("cx", (Math.sin(a) * 8).toFixed(2));
      dot.setAttribute("cy", (-Math.cos(a) * 8).toFixed(2));
      dot.setAttribute("r", "1.3");
      dot.setAttribute("class", "stamen");
      inner.appendChild(dot);
    }
    outer.appendChild(inner);
    return outer;
  }
  if (blossomGroup) blossomSpots.forEach((spot, i) => blossomGroup.appendChild(makeBlossom(spot, i)));

  // Hide branch strokes before first paint so anime.js can "draw" them in
  if (hasAnime && !reduceMotion) {
    document.querySelectorAll(".branch-lines path").forEach((p) => {
      const len = p.getTotalLength();
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
    });
  }

  /* ------------------------------------------------------------------
   * 2. Split the hero name into letters
   * ------------------------------------------------------------------ */
  document.querySelectorAll(".hero-name > span").forEach((word) => {
    const text = word.textContent;
    word.textContent = "";
    for (const ch of text) {
      const s = document.createElement("span");
      s.className = "ch";
      s.setAttribute("aria-hidden", "true");
      s.textContent = ch;
      word.appendChild(s);
    }
  });

  /* ------------------------------------------------------------------
   * 3. Falling petals (canvas)
   * ------------------------------------------------------------------ */
  const canvas = document.getElementById("petals");
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext("2d");
    let W = 0, H = 0;
    let wind = 0;
    let colors = [];

    const readColors = () => {
      const cs = getComputedStyle(document.documentElement);
      colors = ["--sakura", "--sakura-light", "--sakura-deep"].map((v) => cs.getPropertyValue(v).trim());
    };
    readColors();
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", readColors);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const rand = (a, b) => a + Math.random() * (b - a);

    class Petal {
      constructor() { this.reset(true); }
      reset(initial) {
        this.x = initial ? rand(0, W) : rand(-W * 0.2, W);
        this.y = initial ? rand(-H, H) : rand(-60, -20);
        this.size = rand(5, 11);
        this.vy = rand(0.35, 1.0);
        this.vx = rand(0.15, 0.6);
        this.rot = rand(0, Math.PI * 2);
        this.vr = rand(-0.02, 0.02);
        this.flip = rand(0, Math.PI * 2);
        this.vflip = rand(0.015, 0.04);
        this.sway = rand(0, Math.PI * 2);
        this.alpha = rand(0.45, 0.9);
        this.color = Math.floor(rand(0, 3));
      }
      update() {
        this.sway += 0.012;
        this.x += this.vx + Math.sin(this.sway) * 0.5 + wind * (this.size / 8);
        this.y += this.vy;
        this.rot += this.vr;
        this.flip += this.vflip;
        if (this.y > H + 30 || this.x > W + 40 || this.x < -60) this.reset(false);
      }
      draw() {
        const s = this.size;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        ctx.scale(Math.cos(this.flip), 1); // fake 3D tumble
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = colors[this.color] || "#f2a7bb";
        ctx.beginPath();
        ctx.moveTo(0, -0.7 * s);
        ctx.quadraticCurveTo(-0.1 * s, -0.85 * s, -0.28 * s, -s);
        ctx.bezierCurveTo(-1.0 * s, -0.55 * s, -0.65 * s, 0.6 * s, 0, s);
        ctx.bezierCurveTo(0.65 * s, 0.6 * s, 1.0 * s, -0.55 * s, 0.28 * s, -s);
        ctx.quadraticCurveTo(0.1 * s, -0.85 * s, 0, -0.7 * s);
        ctx.fill();
        ctx.restore();
      }
    }

    const count = W < 700 ? 18 : 38;
    const petals = Array.from({ length: count }, () => new Petal());

    // Wind follows the mouse and scroll direction
    let lastX = null;
    window.addEventListener("mousemove", (e) => {
      if (lastX !== null) wind += (e.clientX - lastX) * 0.004;
      lastX = e.clientX;
    }, { passive: true });
    let lastScroll = window.scrollY;
    window.addEventListener("scroll", () => {
      wind += (window.scrollY - lastScroll) * 0.003;
      lastScroll = window.scrollY;
    }, { passive: true });

    const tick = () => {
      wind *= 0.95;
      wind = Math.max(-3, Math.min(3, wind));
      ctx.clearRect(0, 0, W, H);
      for (const p of petals) { p.update(); p.draw(); }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------------
   * 4. Nav state
   * ------------------------------------------------------------------ */
  const nav = document.querySelector(".nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 20);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const navLinks = [...document.querySelectorAll(".nav nav a:not(.nav-cta)")];
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${entry.target.id}`));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  document.querySelectorAll("main section[id]").forEach((s) => sectionObserver.observe(s));

  /* ------------------------------------------------------------------
   * 5. Project detail drawer
   * ------------------------------------------------------------------ */
  const GITHUB_ICON = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.83 1.24 1.83 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.2.69.82.57A12 12 0 0 0 12 .3"/></svg>';
  const LINK_ICON = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M7 17 17 7M8 7h9v9"/></svg>';

  const PROJECTS = {
    chatvtu: {
      num: "01",
      title: "ChatVTU",
      tagline: "Ask your VTU notes a question and get an exam-ready answer, with the source PDF and its diagrams.",
      links: [{ label: "View on GitHub", href: "https://github.com/ProblematicPP/vtu-rag-assistant", icon: GITHUB_ICON, primary: true }],
      problem:
        "ChatGPT and Claude happily answer beyond the VTU syllabus, and they can't show the diagrams VTU marking expects. ChatVTU answers only from what your notes actually say, links the original PDF at the page it used, and shows the diagrams from that page. It runs entirely on your own machine.",
      flow: [
        ["Notes go in", "PDFs filed by branch, scheme, semester and subject. Scanned photocopies are OCR'd automatically."],
        ["Cleaned and chunked", "Repeated headers and footers are stripped, then notes are split at headings into ~350-word chunks that keep their page range."],
        ["Indexed twice", "Each chunk is stored for BM25 keyword search and as a 1024-d vector for semantic search in OpenSearch."],
        ["Agent answers", "A LangGraph agent checks scope, retrieves, grades the excerpts, rewrites the query if needed, then generates."],
        ["Answer comes out", "An exam-style answer with the diagrams from the same page and a link to the source PDF."],
      ],
      highlights: [
        "<strong>Hybrid retrieval:</strong> BM25 and Jina embeddings merged through an OpenSearch normalisation pipeline, so both paraphrases and exact subject codes match.",
        "<strong>Self-checking agent:</strong> an out-of-syllabus guardrail, document grading, query rewriting, and an honest \"not in your notes\" instead of a guess.",
        "<strong>Follow-ups that work:</strong> \"explain them briefly\" is rewritten against the conversation before anything is searched.",
        "<strong>Multi-part questions:</strong> (i)/(ii) parts are split and answered separately, each with its own diagrams.",
        "<strong>Whole question papers:</strong> upload a past paper as a PDF or phone photo and get every question answered as a printable PDF.",
        "<strong>Automatic ingestion:</strong> an Airflow DAG re-indexes every 30 minutes, and unchanged files are skipped by content hash.",
        "<strong>Runs locally:</strong> one <code>docker compose up</code> with Ollama on the GPU, a Redis answer cache, and Langfuse tracing.",
      ],
      stack: ["Python", "FastAPI", "LangGraph", "OpenSearch", "PostgreSQL", "Redis", "Airflow", "Ollama", "Jina AI", "Langfuse", "Docker", "React"],
    },
    doorman: {
      num: "02",
      title: "Doorman",
      tagline: "The hostel register, kept by the people in it.",
      links: [{ label: "Visit live site", href: "https://joindoorman.vercel.app/", icon: LINK_ICON, primary: true }],
      problem:
        "College hostels still run on paper: gate books, leave slips, mess counts, complaint registers. Doorman turns each register into a screen that fills itself in. Students use a mobile app, parents approve over WhatsApp, and wardens and administrators see everything live.",
      flow: [
        ["Student requests leave", "From the Doorman app on their own phone."],
        ["Parent approves on WhatsApp", "They get a message and reply with one word. There's nothing to install."],
        ["Warden approves", "The request waits in the warden portal and is approved in one tap."],
        ["Scan out at the gate", "The student scans the guard's rotating QR, and the guard checks their photo."],
        ["Off the curfew list", "They're marked as home on leave until they scan back in."],
      ],
      highlights: [
        "<strong>QR gate pass:</strong> the entry code rotates every minute, and every resident carries a digital pass with photo, block and room.",
        "<strong>Curfew tracking:</strong> anyone still out gets a reminder on their phone, and the guard sees exactly who hasn't returned.",
        "<strong>Live occupancy:</strong> every block, room and bed, with bulk room creation for setup.",
        "<strong>Mess:</strong> a weekly menu with per-date overrides. Students skip meals in the app, so counts are accurate.",
        "<strong>Complaints and notices:</strong> every complaint is tracked and stale ones are flagged. Notices go to one block or the whole institution.",
        "<strong>Fees:</strong> payment receipts and a dues diary for every resident.",
        "<strong>Multi-tenant:</strong> an admin login spans every hostel, while wardens can be pinned to a single block.",
      ],
      stack: ["FastAPI", "PostgreSQL", "React", "React Native", "WhatsApp API"],
    },
    clipper: {
      num: "03",
      title: "Esports VOD Auto-Clipper",
      tagline: "Hours of VALORANT VODs in, vertical highlight clips out.",
      links: [{ label: "View on GitHub", href: "https://github.com/ProblematicPP/AI-E-Sports-Clipper", icon: GITHUB_ICON, primary: true }],
      problem:
        "Finding the clip-worthy moments in a multi-hour tournament VOD means scrubbing through footage for hours. This pipeline listens to the casters instead: it finds the hype, cuts it, and formats it for TikTok and Reels.",
      flow: [
        ["Extract audio", "FFmpeg pulls the audio track out of the VOD."],
        ["Transcribe", "faster-whisper large-v3 on CUDA (float16) produces timestamps for every word."],
        ["Find the hype", "Gemini 2.5 Pro reads the transcript and returns the aces, clutches and caster reactions as timestamps."],
        ["Cut and reframe", "FFmpeg trims each moment and renders a 1080×1920 vertical clip."],
      ],
      highlights: [
        "<strong>Word-level timing:</strong> the transcript is fed to the LLM as <code>[start-end] word</code> lines, so it can point to exact seconds.",
        "<strong>VALORANT-aware prompt:</strong> it looks for multi-kills, clutches and loud caster moments, using game context to judge what's clip-worthy.",
        "<strong>Smart merging:</strong> hype moments less than 23 seconds apart become one clip, capped at a minute.",
        "<strong>Context padding:</strong> 8 seconds before each moment for build-up and 2 seconds after.",
        "<strong>9:16 render:</strong> a zoomed centre crop over a blurred full-frame background, encoded to H.264/AAC.",
      ],
      stack: ["Python", "faster-whisper", "CUDA", "Gemini API", "FFmpeg"],
    },
  };

  const drawer = document.getElementById("project-drawer");
  const panel = drawer.querySelector(".drawer-panel");
  const backdrop = drawer.querySelector(".drawer-backdrop");
  const drawerBody = drawer.querySelector(".drawer-body");
  const drawerNum = document.getElementById("drawer-num");
  const animateDrawer = hasGsap && !reduceMotion;
  let lastFocus = null;
  let drawerOpen = false;

  function renderProject(p) {
    drawerNum.textContent = `Project ${p.num}`;
    drawerBody.innerHTML = `
      <h2 class="d-title" id="drawer-title">${p.title}</h2>
      <p class="d-tagline">${p.tagline}</p>
      <div class="d-links">${p.links
        .map((l) => `<a class="btn ${l.primary ? "btn-primary" : "btn-ghost"}" href="${l.href}" target="_blank" rel="noopener">${l.icon}${l.label}</a>`)
        .join("")}</div>
      <h3 class="d-label">The problem</h3>
      <p class="d-text">${p.problem}</p>
      <h3 class="d-label">How it works</h3>
      <ol class="flow">${p.flow.map(([t, d]) => `<li><strong>${t}</strong><span>${d}</span></li>`).join("")}</ol>
      <h3 class="d-label">Highlights</h3>
      <ul class="d-points">${p.highlights.map((h) => `<li>${h}</li>`).join("")}</ul>
      <h3 class="d-label">Stack</h3>
      <ul class="tags">${p.stack.map((s) => `<li>${s}</li>`).join("")}</ul>`;
  }

  function openProject(id, trigger) {
    const p = PROJECTS[id];
    if (!p || drawerOpen) return;
    drawerOpen = true;
    lastFocus = trigger || document.activeElement;
    renderProject(p);
    panel.scrollTop = 0;
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("no-scroll");
    drawer.querySelector(".drawer-close").focus({ preventScroll: true });

    if (animateDrawer) {
      gsap.killTweensOf([panel, backdrop]);
      gsap.timeline()
        .fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.out" }, 0)
        .fromTo(panel, { xPercent: 100 }, { xPercent: 0, duration: 0.75, ease: "expo.out" }, 0)
        .from(drawerBody.children, { y: 26, opacity: 0, duration: 0.6, stagger: 0.04, ease: "power3.out" }, 0.18);
    }
  }

  function closeProject() {
    if (!drawerOpen) return;
    drawerOpen = false;
    const finish = () => {
      drawer.classList.remove("open");
      drawer.setAttribute("aria-hidden", "true");
      document.documentElement.classList.remove("no-scroll");
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    };
    if (animateDrawer) {
      gsap.killTweensOf([panel, backdrop]);
      gsap.timeline({ onComplete: finish })
        .to(panel, { xPercent: 100, duration: 0.45, ease: "power3.in" }, 0)
        .to(backdrop, { opacity: 0, duration: 0.35, ease: "power2.in" }, 0.1);
    } else {
      finish();
    }
  }

  document.querySelectorAll(".project-row").forEach((row) => {
    row.addEventListener("click", () => openProject(row.dataset.project, row));
  });
  drawer.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", closeProject));
  document.addEventListener("keydown", (e) => {
    if (!drawerOpen) return;
    if (e.key === "Escape") closeProject();
    if (e.key === "Tab") {
      // keep keyboard focus inside the drawer
      const focusables = panel.querySelectorAll("a[href], button");
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  if (reduceMotion) return;

  /* ------------------------------------------------------------------
   * 6. Hero intro (anime.js)
   * ------------------------------------------------------------------ */
  if (hasAnime) {
    const branchPaths = document.querySelectorAll(".branch-lines path");
    const intro = anime.timeline({ easing: "easeOutExpo" });

    intro
      .add({
        targets: ".hero-name .ch",
        translateY: [90, 0],
        rotate: [10, 0],
        opacity: [0, 1],
        duration: 1300,
        delay: anime.stagger(45),
      })
      .add({
        targets: ".hero-fade",
        translateY: [24, 0],
        opacity: [0, 1],
        duration: 1000,
        delay: anime.stagger(120),
      }, "-=900")
      .add({
        targets: branchPaths,
        strokeDashoffset: [anime.setDashoffset, 0],
        easing: "easeInOutSine",
        duration: 1600,
        delay: anime.stagger(180),
      }, 200)
      .add({
        targets: ".blossom-inner",
        scale: [0, 1],
        rotate: [-60, 0],
        opacity: [0, 1],
        easing: "easeOutElastic(1, .55)",
        duration: 1400,
        delay: anime.stagger(70, { from: "last" }),
      }, 900);

    // Burst of petals on click
    document.addEventListener("click", (e) => {
      if (e.target.closest("a, button, .drawer")) return;
      const n = 8;
      for (let i = 0; i < n; i++) {
        const p = document.createElement("span");
        p.className = "burst-petal";
        p.style.left = `${e.clientX - 6}px`;
        p.style.top = `${e.clientY - 6}px`;
        document.body.appendChild(p);
        const angle = (i / n) * Math.PI * 2 + Math.random() * 0.5;
        const dist = anime.random(40, 90);
        anime({
          targets: p,
          translateX: Math.cos(angle) * dist,
          translateY: [0, Math.sin(angle) * dist + 40],
          rotate: anime.random(-200, 200),
          scale: [{ value: 1.2, duration: 200 }, { value: 0.4, duration: 900 }],
          opacity: [{ value: 1, duration: 100 }, { value: 0, duration: 1000, delay: 200 }],
          easing: "easeOutCubic",
          duration: 1200,
          complete: () => p.remove(),
        });
      }
    });
  }

  /* ------------------------------------------------------------------
   * 7. Scroll animations (GSAP + ScrollTrigger)
   * ------------------------------------------------------------------ */
  if (hasGsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    // Gentle sway of the whole branch, plus parallax on scroll
    gsap.to(".branch", {
      rotate: 1.5,
      transformOrigin: "100% 100%",
      duration: 4,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });
    gsap.to(".hero-art", {
      yPercent: -12,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
    });
    gsap.to(".hero-text", {
      yPercent: -8,
      opacity: 0.3,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
    });

    gsap.utils.toArray("[data-reveal]").forEach((el) => {
      gsap.from(el, {
        y: 40,
        opacity: 0,
        duration: 1.1,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
      });
    });

    gsap.utils.toArray("[data-reveal-stagger]").forEach((group) => {
      gsap.from(group.children, {
        y: 50,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        stagger: 0.12,
        scrollTrigger: { trigger: group, start: "top 82%", once: true },
      });
    });

    // Timeline line grows as you scroll
    gsap.fromTo(".timeline-line span",
      { scaleY: 0 },
      {
        scaleY: 1,
        ease: "none",
        scrollTrigger: { trigger: ".timeline", start: "top 75%", end: "bottom 60%", scrub: true },
      });
  }
})();
