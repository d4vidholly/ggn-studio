/* GGN Studio — main.js */

/* ── Sticker data ─────────────────────────────────────────── *
 *  To swap in artwork: update `img` path for each sticker.    *
 *  To update metadata: edit `project` and `client`.           *
 *  Blank slots: set badge path (e.g. "assets/aleague.png").   *
 * ─────────────────────────────────────────────────────────── */
const STICKERS = [
  {
    id: 1,
    img:         "album/Primary/1.webp",
    alt:         "Erling Haaland — GGN Studio portrait illustration",
    project:     "Erling Haaland",
    client:      "Cup Heroes Series - Wembley Game",
    description: "Portrait illustration. Procreate.",
  },
  {
    id: 2,
    img:         "album/Primary/2.webp",
    alt:         "Kevin De Bruyne — GGN Studio portrait illustration",
    project:     "Kevin De Bruyne",
    client:      "Cup Heroes Series - Wembley Game",
    description: "Portrait illustration. Procreate.",
  },
  {
    id: 3,
    img:         "album/Primary/3.webp",
    alt:         "Michael Carrick — GGN Studio portrait illustration",
    project:     "Michael Carrick",
    client:      "Editorial Submission",
    description: "Portrait illustration. Procreate.",
  },
  {
    id: 4,
    img:         "album/Primary/4.webp",
    alt:         "Didier Drogba — GGN Studio portrait illustration",
    project:     "Didier Drogba",
    client:      "Cup Heroes Series - Wembley Game",
    description: "Portrait illustration. Procreate.",
  },
  {
    id: 5,
    img:         "album/Primary/5.webp",
    alt:         "Regen Graphics FC — GGN Studio kit illustration",
    project:     "Social Media Submission",
    client:      "Alnwick Town",
    description: "Full-body kit illustration. Non-league commission.",
  },
  {
    id: 6,
    img:         "album/Primary/6.webp",
    alt:         "Tow Law Town FC — GGN Studio ground illustration",
    project:     "Programme Submission",
    client:      "Tow Law Town",
    description: "Ground illustration. Matchday programme cover. EBAC Northern League Division 2.",
    secondary:   ["album/Secondary/6b.webp"],
  },
  /* Slot 7 — blank guide, target for peel mechanic */
  { id: 7, blank: true, num: "07", badge: "", text: "This could be you!" },
  /* Slot 8 — peelable sticker stack, drag to slot 7 to unlock contact */
  { id: 8, peel: true },
];

/* Seeded rotations per slot — ±1–2 degrees, guides stay upright */
const ROTS = [-1.5, 2.0, -1.2, 1.8, -2.0, 1.4, -1.7, 2.1];

/* ── Init ─────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("js-loaded");
  document.documentElement.classList.add("site-locked");
  renderAlbum();
  setupPacket();
  setupHoloCard();
  setupStickerPeel();
  setupContactModal();
  setupModal();
  setupForm();
  setupHamburger();
  /* Direct hash navigation bypasses the packet — reveal everything immediately */
  if (window.location.hash && window.location.hash !== "#hero") revealAll();
});

/* ── Album ────────────────────────────────────────────────── */
function renderAlbum() {
  const grid = document.getElementById("albumGrid");

  STICKERS.forEach((s, i) => {
    const li = document.createElement("div");
    li.className = "album-slot";
    li.setAttribute("role", "listitem");
    li.setAttribute("data-slot-id", s.id);

    if (s.peel) {
      li.classList.add("sticker-item", "sticker-peel");
      li.innerHTML = peelHTML(s);
    } else if (s.blank) {
      li.classList.add("sticker-item", "sticker-blank");
      li.innerHTML = blankHTML(s);
    } else {
      li.classList.add("sticker-item");
      li.style.setProperty("--rot", `${ROTS[i] ?? 0}deg`);
      li.innerHTML = filledHTML(s);
      li.querySelector(".sticker-btn").addEventListener("click", () => openModal(s));
    }

    grid.appendChild(li);
  });
}

function filledHTML(s) {
  return `
    <div class="sticker-frame">
      <div class="sticker-guide"></div>
      <button class="sticker-btn" aria-label="Open ${s.alt}">
        <img class="sticker-img" src="${s.img}" alt="${s.alt}" loading="lazy">
      </button>
    </div>
    <div class="sticker-meta">
      <p class="meta-project">${s.project}</p>
      <p class="meta-client">${s.client}</p>
    </div>`;
}

function blankHTML(s) {
  return `
    <div class="sticker-frame">
      <div class="sticker-guide" aria-hidden="true"></div>
      <div class="sticker-btn" aria-hidden="true"><div class="sticker-img"></div></div>
      <div class="blank-overlay" aria-hidden="true">
        <span class="blank-num">${s.num}</span>
        <img class="blank-logo" src="logo_black.png" alt="">
      </div>
    </div>
    <div class="sticker-meta">
      <p class="meta-project">Your Project Here:</p>
      <p class="meta-client">—</p>
    </div>`;
}

function peelHTML(s) {
  return `
    <div class="peel-stack">
      <div class="peel-back peel-back--far"  aria-hidden="true"><img class="peel-img" src="client_sticker.webp" alt="" draggable="false" loading="lazy"></div>
      <div class="peel-back peel-back--mid"  aria-hidden="true"><img class="peel-img" src="GGN.webp" alt="" draggable="false" loading="lazy"></div>
      <div class="peel-top" id="peelTop"
           role="button" tabindex="0"
           aria-label="Grab this sticker and place it on slot 7"
           aria-grabbed="false">
        <img class="peel-img" src="client_sticker.webp" alt="Client sticker" draggable="false" loading="lazy">
      </div>
    </div>
    <div class="sticker-meta">
      <p class="meta-project">Your Project Pile</p>
      <p class="meta-client">—</p>
    </div>`;
}

/* ── Sticker peel mechanic ────────────────────────────────── */
function setupStickerPeel() {
  const peelTop = document.getElementById("peelTop");
  if (!peelTop) return;

  let isDragging   = false;
  let ghost        = null;
  let originRect   = null;
  let offsetX      = 0;
  let offsetY      = 0;
  let isPlaced     = false;
  let pendingStart = null; /* touch start coords — not yet committed to drag */

  function slot7Frame() {
    return document.querySelector('[data-slot-id="7"] .sticker-frame');
  }

  function makeGhost(rect) {
    const g   = document.createElement("div");
    const img = peelTop.querySelector(".peel-img");
    g.className = "peel-ghost";
    g.style.left   = rect.left   + "px";
    g.style.top    = rect.top    + "px";
    g.style.width  = rect.width  + "px";
    g.style.height = rect.height + "px";
    if (img) {
      const ic = img.cloneNode(true);
      g.appendChild(ic);
    }
    document.body.appendChild(g);
    return g;
  }

  function commitGhostDrag(startX, startY, currentX, currentY) {
    isDragging = true;
    const rect = peelTop.getBoundingClientRect();
    originRect = rect;
    offsetX    = startX - rect.left;
    offsetY    = startY - rect.top;
    ghost      = makeGhost(rect);
    ghost.style.left = (currentX - offsetX) + "px";
    ghost.style.top  = (currentY - offsetY) + "px";
    peelTop.classList.add("is-peeling");
    peelTop.setAttribute("aria-grabbed", "true");
    document.body.classList.add("is-dragging-sticker");
    pendingStart = null;
  }

  function startDrag(clientX, clientY, isTouch) {
    if (isPlaced) return;
    if (isTouch) {
      /* Defer ghost creation until we confirm it's a horizontal drag, not a scroll */
      pendingStart = { clientX, clientY };
    } else {
      commitGhostDrag(clientX, clientY, clientX, clientY);
    }
  }

  function moveDrag(clientX, clientY) {
    if (pendingStart) {
      const dx = Math.abs(clientX - pendingStart.clientX);
      const dy = Math.abs(clientY - pendingStart.clientY);
      if (dx + dy < 6) return;
      if (dx >= dy) {
        commitGhostDrag(pendingStart.clientX, pendingStart.clientY, clientX, clientY);
      } else {
        pendingStart = null; /* vertical scroll — cancel */
      }
      return;
    }
    if (!isDragging || !ghost) return;
    ghost.style.left = (clientX - offsetX) + "px";
    ghost.style.top  = (clientY - offsetY) + "px";
  }

  function endDrag(clientX, clientY) {
    pendingStart = null;
    if (!isDragging || !ghost) return;
    isDragging = false;
    document.body.classList.remove("is-dragging-sticker");
    peelTop.setAttribute("aria-grabbed", "false");

    const frame = slot7Frame();
    if (frame) {
      const s7   = frame.getBoundingClientRect();
      const gr   = ghost.getBoundingClientRect();
      const cx   = gr.left + gr.width  / 2;
      const cy   = gr.top  + gr.height / 2;
      const hit  = cx >= s7.left && cx <= s7.right &&
                   cy >= s7.top  && cy <= s7.bottom;
      if (hit) { snapToSlot7(frame); return; }
    }
    snapBack();
  }

  function snapToSlot7(frame) {
    isPlaced = true;
    const s7 = frame.getBoundingClientRect();
    ghost.style.transition = "left 0.3s cubic-bezier(0.22,1,0.36,1), top 0.3s cubic-bezier(0.22,1,0.36,1), transform 0.3s cubic-bezier(0.22,1,0.36,1)";
    ghost.style.left       = s7.left  + "px";
    ghost.style.top        = s7.top   + "px";
    ghost.style.width      = s7.width + "px";
    ghost.style.height     = s7.height + "px";
    ghost.style.transform  = "none";

    setTimeout(() => {
      placeStickerInSlot7(frame, peelTop.querySelector(".peel-img")?.src);
      ghost.remove();
      ghost = null;
      peelTop.classList.add("is-placed");
      peelTop.classList.remove("is-peeling");
      const slot8Meta = document.querySelector('[data-slot-id="8"] .meta-project');
      if (slot8Meta) slot8Meta.textContent = "Your New Signing?";
      setTimeout(openContactModal, 1000);
    }, 320);
  }

  function snapBack() {
    const rect = originRect;
    ghost.style.transition = "left 0.4s cubic-bezier(0.22,1,0.36,1), top 0.4s cubic-bezier(0.22,1,0.36,1), transform 0.4s cubic-bezier(0.22,1,0.36,1)";
    ghost.style.left       = rect.left + "px";
    ghost.style.top        = rect.top  + "px";
    ghost.style.transform  = "rotate(1.5deg) scale(1)";
    setTimeout(() => {
      ghost?.remove();
      ghost = null;
      peelTop.classList.remove("is-peeling");
    }, 420);
  }

  peelTop.addEventListener("mousedown",  (e) => { e.preventDefault(); startDrag(e.clientX, e.clientY, false); });
  document.addEventListener("mousemove", (e) => moveDrag(e.clientX, e.clientY));
  document.addEventListener("mouseup",   (e) => endDrag(e.clientX, e.clientY));

  peelTop.addEventListener("touchstart",  (e) => { startDrag(e.touches[0].clientX, e.touches[0].clientY, true); }, { passive: true });
  document.addEventListener("touchmove",  (e) => { if (isDragging || pendingStart) moveDrag(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  document.addEventListener("touchend",   (e) => endDrag(e.changedTouches[0].clientX, e.changedTouches[0].clientY));
}

function placeStickerInSlot7(frame, imgSrc) {
  const placed = document.createElement("div");
  placed.className = "placed-sticker";
  const img = document.createElement("img");
  img.src       = imgSrc || "";
  img.alt       = "Placed sticker";
  img.draggable = false;
  placed.appendChild(img);
  frame.appendChild(placed);
}

/* ── Contact modal (sticker peel) ─────────────────────────── */
let contactLastFocus = null;

function openContactModal() {
  contactLastFocus = document.activeElement;
  const wrap = document.getElementById("contactModalWrap");
  wrap.hidden = false;
  document.body.style.overflow = "hidden";
  document.getElementById("contactModalClose").focus();
}

function closeContactModal() {
  const wrap = document.getElementById("contactModalWrap");
  if (wrap.hidden) return;
  wrap.hidden = true;
  document.body.style.overflow = "";
  contactLastFocus?.focus();
}

function setupContactModal() {
  document.getElementById("contactModalClose").addEventListener("click", closeContactModal);
  document.getElementById("contactModalWrap").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeContactModal();
  });
  document.getElementById("contactModalForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const ok = document.getElementById("contactModalOk");
    ok.hidden = false;
    e.target.reset();
    ok.focus();
  });
  document.addEventListener("keydown", (e) => {
    if (!document.getElementById("contactModalWrap").hidden && e.key === "Escape") {
      closeContactModal();
    }
  });
}

/* ── Hamburger nav ────────────────────────────────────────── */
function setupHamburger() {
  const btn   = document.getElementById("navHamburger");
  const panel = document.getElementById("navRight");
  if (!btn || !panel) return;

  function openMenu() {
    panel.classList.add("is-open");
    btn.setAttribute("aria-expanded", "true");
    btn.setAttribute("aria-label", "Close navigation menu");
  }

  function closeMenu() {
    panel.classList.remove("is-open");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-label", "Open navigation menu");
  }

  btn.addEventListener("click", () => {
    panel.classList.contains("is-open") ? closeMenu() : openMenu();
  });

  panel.querySelectorAll("a").forEach(a => a.addEventListener("click", closeMenu));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("is-open")) {
      closeMenu();
      btn.focus();
    }
  });

  document.addEventListener("click", (e) => {
    if (panel.classList.contains("is-open") &&
        !panel.contains(e.target) &&
        !btn.contains(e.target)) {
      closeMenu();
    }
  });
}

/* ── Theme toggle ─────────────────────────────────────────── */

/* ── Packet open ──────────────────────────────────────────── */
function setupPacket() {
  document.getElementById("openBtn").addEventListener("click", openPacket);
  /* Also clicking the packet itself triggers the animation */
  document.getElementById("packetScene").addEventListener("click", openPacket);
}

let packetOpened = false;

function openPacket() {
  if (packetOpened) return;
  packetOpened = true;

  const btn    = document.getElementById("openBtn");
  const scene  = document.getElementById("packetScene");

  btn.disabled = true;
  scene.style.pointerEvents = "none";

  if (prefersReducedMotion()) {
    scrollToAbout();
    return;
  }

  scene.classList.add("is-shaking");

  scene.addEventListener("animationend", function onShake(e) {
    if (e.animationName !== "pkt-shake") return;
    scene.removeEventListener("animationend", onShake);
    scene.classList.remove("is-shaking");
    scene.classList.add("is-flying");
    setTimeout(scrollToAbout, 600);
  });
}

let siteRevealed = false;
let textRevealed = false;

function unlockAndAnimateLogo() {
  if (prefersReducedMotion()) {
    document.documentElement.classList.remove("site-locked");
    return;
  }
  const logo   = document.querySelector(".nav-logo");
  const before = logo.getBoundingClientRect();

  document.documentElement.classList.remove("site-locked");

  const after = logo.getBoundingClientRect();
  const dx    = before.left - after.left;

  if (Math.abs(dx) < 1) return;

  logo.style.transition = "none";
  logo.style.transform  = `translateX(${dx}px)`;
  void logo.getBoundingClientRect(); /* force reflow */
  logo.style.transition = "transform 1.2s cubic-bezier(0.22, 1, 0.36, 1)";
  logo.style.transform  = "translateX(0)";
  logo.addEventListener("transitionend", () => {
    logo.style.removeProperty("transform");
    logo.style.removeProperty("transition");
  }, { once: true });
}

function scrollToAbout() {
  if (siteRevealed) return;
  siteRevealed = true;

  const about    = document.getElementById("about");
  const card     = document.getElementById("holoCard");
  const sparkles = document.getElementById("sparkleContainer");

  unlockAndAnimateLogo();

  /* Update CTA to post-open state */
  const btn = document.getElementById("openBtn");
  btn.textContent = "Let's see who you got";
  btn.classList.add("is-opened");
  btn.disabled = false;
  btn.addEventListener("click", () =>
    document.getElementById("about").scrollIntoView({ behavior: "smooth" })
  );

  about.classList.add("is-revealed", "about--centering");
  about.scrollIntoView({ behavior: "smooth" });

  if (prefersReducedMotion()) { revealAll(); return; }

  /* Card wow entrance — centred in section via layout */
  setTimeout(() => {
    card.classList.add("card-enter");

    /* Sparkle burst mid-animation */
    setTimeout(() => {
      for (let i = 0; i < 18; i++) setTimeout(() => spawnSparkle(sparkles), i * 76);
    }, 720);

    /* After card settles: brief pause, then slide left */
    const fallback = setTimeout(() => {
      card.style.opacity = "1";
      slideCardLeft();
    }, 4000);
    card.addEventListener("animationend", () => {
      clearTimeout(fallback);
      card.classList.remove("card-enter");
      card.style.opacity = "1";
      setTimeout(slideCardLeft, 400);
    }, { once: true });
  }, 600);

  /* Nav + remaining sections follow */
  setTimeout(() => {
    document.querySelectorAll(".nav-links, .nav-cta, .nav-hamburger").forEach(el =>
      el.classList.add("is-revealed")
    );
  }, 3400);
  setTimeout(() => {
    document.getElementById("album").classList.add("is-revealed");
    document.getElementById("contact").classList.add("is-revealed");
  }, 4200);
}

let cardSlid = false;
function slideCardLeft() {
  if (cardSlid) return;
  cardSlid = true;

  const about = document.getElementById("about");
  const card  = document.getElementById("holoCard");

  /* Mobile: single-column layout. Measure card position before and after
     removing about--centering so the card slides up smoothly as text appears. */
  if (window.innerWidth < 820) {
    const before = card.getBoundingClientRect();
    about.classList.remove("about--centering");
    const after = card.getBoundingClientRect();
    const dy = before.top - after.top;

    if (Math.abs(dy) > 1) {
      card.style.transition = "none";
      card.style.transform  = `rotate(-5deg) translateY(${dy}px)`;
      void card.getBoundingClientRect();
      card.style.transition = "transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)";
      card.style.transform  = "rotate(-5deg)";
      card.addEventListener("transitionend", function onEnd(e) {
        if (e.propertyName !== "transform") return;
        card.removeEventListener("transitionend", onEnd);
        card.style.removeProperty("transform");
        card.style.removeProperty("transition");
        revealStagedText();
      });
    } else {
      revealStagedText();
    }
    return;
  }

  /* FLIP: measure centred position */
  const before = card.getBoundingClientRect();

  /* Switch to two-column layout — card jumps to left column */
  about.classList.remove("about--centering");

  /* Measure left-column position */
  const after = card.getBoundingClientRect();
  const dx = before.left - after.left;
  const dy = before.top  - after.top;

  /* Snap back to centred via inverse transform */
  card.style.transition = "none";
  card.style.transform  = `rotate(-5deg) translateX(${dx}px) translateY(${dy}px)`;
  void card.getBoundingClientRect(); /* force reflow */

  /* Animate to final left-column position */
  card.style.transition = "transform 1.0s cubic-bezier(0.22, 1, 0.36, 1)";
  card.style.transform  = "rotate(-5deg)";

  function onSlideEnd(e) {
    if (e.propertyName !== "transform") return;
    card.removeEventListener("transitionend", onSlideEnd);
    card.style.removeProperty("transform");
    card.style.removeProperty("transition");
    revealStagedText();
  }
  card.addEventListener("transitionend", onSlideEnd);
}

function revealAll() {
  siteRevealed = true;
  cardSlid = true;
  document.documentElement.classList.remove("site-locked");
  document.getElementById("holoCard").style.opacity = "1";
  document.getElementById("about")?.classList.remove("about--centering");

  /* Kill transitions so everything appears instantly */
  document.body.classList.add("reveal-instant");
  ["about", "album", "contact"].forEach(id =>
    document.getElementById(id)?.classList.add("is-revealed")
  );
  document.querySelectorAll(".nav-links, .nav-cta, .nav-hamburger").forEach(el =>
    el.classList.add("is-revealed")
  );
  revealStagedText(true);

  /* Re-scroll to hash after lock is cleared, then restore transitions */
  requestAnimationFrame(() => {
    const hash = window.location.hash;
    if (hash && hash !== "#hero") {
      document.querySelector(hash)?.scrollIntoView({ behavior: "instant" });
    }
    document.body.classList.remove("reveal-instant");
  });
}

function revealStagedText(instant = false) {
  if (textRevealed) return;
  textRevealed = true;
  const DELAYS = instant ? [0, 0, 0, 0] : [0, 200, 450, 720];
  document.querySelectorAll("[data-stage]").forEach((el) => {
    const delay = DELAYS[parseInt(el.dataset.stage ?? "0")] ?? 0;
    setTimeout(() => el.classList.add("revealed"), delay);
  });
}

/* ── Holographic card ─────────────────────────────────────── */
function setupHoloCard() {
  const card     = document.getElementById("holoCard");
  const sparkles = document.getElementById("sparkleContainer");

  if (!card || prefersReducedMotion()) return;

  let sparkleInterval = null;
  let isGrabbing      = false;
  let grabStartX      = 0;
  let grabStartY      = 0;
  let grabMoved       = false;
  let touchActive     = false;
  let grabStartTime   = 0;

  function setShimmer(mx, my) {
    card.style.setProperty("--mx",    mx);
    card.style.setProperty("--my",    my);
    card.style.setProperty("--angle", mx * 3.6);
    card.classList.add("is-holo-active");
  }

  function clearShimmer() {
    card.classList.remove("is-holo-active");
    card.style.removeProperty("--mx");
    card.style.removeProperty("--my");
    card.style.removeProperty("--angle");
  }

  /* ── Hover shimmer + tilt (mouse only, suppressed during grab) ── */
  card.addEventListener("mousemove", (e) => {
    if (isGrabbing) return;
    const r  = card.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width)  * 100;
    const my = ((e.clientY - r.top)  / r.height) * 100;
    setShimmer(mx, my);
    const tiltX = (my / 100 - 0.5) * -14;
    const tiltY = (mx / 100 - 0.5) *  14;
    card.style.transform =
      `rotate(-5deg) perspective(700px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
    if (Math.random() < 0.18) spawnSparkle(sparkles, mx, my);
  });

  card.addEventListener("mouseenter", () => {
    if (isGrabbing) return;
    sparkleInterval = setInterval(() => spawnSparkle(sparkles), 120);
  });

  card.addEventListener("click", () => {
    if (isGrabbing) return;
    for (let i = 0; i < 12; i++) setTimeout(() => spawnSparkle(sparkles), i * 35);
  });

  card.addEventListener("mouseleave", () => {
    if (isGrabbing) return;
    clearInterval(sparkleInterval);
    card.style.removeProperty("transform");
    clearShimmer();
  });

  /* ── Drag to rotate (mouse + touch) ── */
  function startGrab(clientX, clientY, isTouch) {
    isGrabbing    = true;
    touchActive   = !!isTouch;
    grabMoved     = false;
    grabStartTime = Date.now();
    grabStartX    = clientX;
    grabStartY    = clientY;
    clearInterval(sparkleInterval);
    card.classList.add("is-grabbing");
    card.style.transition = "none";
    clearShimmer();
  }

  function moveGrab(clientX, clientY) {
    if (!isGrabbing) return;
    const dx = clientX - grabStartX;
    const dy = clientY - grabStartY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) grabMoved = true;

    const rotY = Math.max(-30, Math.min(30, dx * 0.4));
    const rotX = Math.max(-30, Math.min(30, -dy * 0.4));
    card.style.transform =
      `rotate(-5deg) perspective(700px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;

    /* Shimmer follows drag position on both mouse and touch */
    const r  = card.getBoundingClientRect();
    const mx = Math.max(0, Math.min(100, ((clientX - r.left) / r.width)  * 100));
    const my = Math.max(0, Math.min(100, ((clientY - r.top)  / r.height) * 100));
    setShimmer(mx, my);
    if (Math.random() < 0.18) spawnSparkle(sparkles, mx, my);
  }

  function endGrab() {
    if (!isGrabbing) return;
    isGrabbing = false;
    card.classList.remove("is-grabbing");

    const isTap = touchActive && !grabMoved && (Date.now() - grabStartTime < 500);
    touchActive = false;

    if (isTap) {
      /* Touch tap: flash shimmer at centre + sparkle burst */
      setShimmer(50, 50);
      for (let i = 0; i < 12; i++) setTimeout(() => spawnSparkle(sparkles), i * 35);
      setTimeout(() => { if (!isGrabbing) clearShimmer(); }, 800);
    } else {
      clearShimmer();
    }

    card.style.transition = "transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)";
    card.style.transform  = "rotate(-5deg)";
    setTimeout(() => {
      if (!isGrabbing) {
        card.style.removeProperty("transform");
        card.style.removeProperty("transition");
      }
    }, 700);
  }

  card.addEventListener("mousedown",    (e) => { e.preventDefault(); startGrab(e.clientX, e.clientY, false); });
  document.addEventListener("mousemove", (e) => moveGrab(e.clientX, e.clientY));
  document.addEventListener("mouseup",   ()  => endGrab());

  card.addEventListener("touchstart",   (e) => startGrab(e.touches[0].clientX, e.touches[0].clientY, true), { passive: true });
  document.addEventListener("touchmove", (e) => { if (isGrabbing) moveGrab(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  document.addEventListener("touchend",  ()  => endGrab());
}

function spawnSparkle(container, pct_x, pct_y) {
  const el = document.createElement("div");
  el.className = "sparkle";

  const left = pct_x !== undefined ? Math.min(93, Math.max(7, pct_x + (Math.random() - 0.5) * 10)) : Math.random() * 86 + 7;
  const top  = pct_y !== undefined ? Math.min(93, Math.max(7, pct_y + (Math.random() - 0.5) * 10)) : Math.random() * 86 + 7;
  el.style.left = left + "%";
  el.style.top  = top  + "%";

  const size = 4 + Math.random() * 6;
  el.style.width = el.style.height = size + "px";

  /* Iridescent palette: mostly silver/white, occasional holo colour */
  const palette = [
    [0,   0,  97],  /* white      */
    [0,   0,  97],  /* white      */
    [0,   0,  85],  /* silver     */
    [200, 65, 88],  /* pale blue  */
    [280, 60, 90],  /* pale violet*/
    [45,  75, 88],  /* gold       */
    [320, 60, 92],  /* pale pink  */
    [160, 55, 90],  /* pale mint  */
  ];
  const [h, s, l] = palette[Math.floor(Math.random() * palette.length)];
  el.style.background = `hsl(${h},${s}%,${l}%)`;
  el.style.boxShadow  = `0 0 ${Math.round(size * 1.8)}px 1px hsl(${h},${s}%,${l}%)`;

  container.appendChild(el);
  el.addEventListener("animationend", () => el.remove(), { once: true });
}

/* ── Staged text reveal — called by scrollToAbout sequence ── */

/* ── Modal ────────────────────────────────────────────────── */
let lastFocus   = null;
let modalSlides = [];
let modalIdx    = 0;
let touchStartX = 0;
let touchStartY = 0;

function setupModal() {
  const wrap   = document.getElementById("modalWrap");
  const viewer = document.getElementById("modalViewer");

  document.getElementById("modalClose").addEventListener("click", closeModal);
  document.getElementById("modalPrev").addEventListener("click", modalPrev);
  document.getElementById("modalNext").addEventListener("click", modalNext);
  wrap.addEventListener("click", (e) => { if (e.target === wrap) closeModal(); });

  viewer.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  viewer.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (dy > 60 && dy > Math.abs(dx)) { closeModal(); return; }
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) dx < 0 ? modalNext() : modalPrev();
  });

  document.addEventListener("keydown", (e) => {
    if (wrap.hidden) return;
    if (e.key === "Escape")     { closeModal(); return; }
    if (e.key === "ArrowRight") { modalNext();  return; }
    if (e.key === "ArrowLeft")  { modalPrev();  return; }
    if (e.key === "Tab")        { trapFocus(e); }
  });
}

function openModal(s) {
  lastFocus = document.activeElement;

  modalSlides = [{ src: s.img, alt: s.alt, type: "img" }];
  (s.secondary || []).forEach((src) => {
    modalSlides.push({ src, alt: s.alt, type: src.endsWith(".mp4") ? "video" : "img" });
  });
  modalIdx = 0;

  const hasMultiple = modalSlides.length > 1;
  document.getElementById("modalPrev").hidden = !hasMultiple;
  document.getElementById("modalNext").hidden = !hasMultiple;

  document.getElementById("modal-project").textContent = s.project;
  document.getElementById("modal-client").textContent  = s.client;
  const descEl = document.getElementById("modal-desc");
  descEl.textContent = s.description || "";
  descEl.hidden = !s.description;

  renderModalSlide();
  renderModalDots();

  const wrap = document.getElementById("modalWrap");
  wrap.hidden = false;
  document.body.style.overflow = "hidden";
  document.getElementById("modalClose").focus();
}

function renderModalSlide() {
  const viewer        = document.getElementById("modalViewer");
  const { src, alt, type } = modalSlides[modalIdx];
  if (type === "video") {
    viewer.innerHTML = `<video class="modal-media" src="${src}" autoplay muted loop playsinline></video>`;
  } else {
    viewer.innerHTML = `<img class="modal-media" src="${src}" alt="${alt}" loading="lazy">`;
  }
}

function renderModalDots() {
  const dots = document.getElementById("modalDots");
  if (modalSlides.length <= 1) { dots.hidden = true; return; }
  dots.hidden = false;
  dots.innerHTML = modalSlides
    .map((_, i) => `<button class="modal-dot${i === modalIdx ? " is-active" : ""}"
      aria-label="Slide ${i + 1}" data-idx="${i}"></button>`)
    .join("");
  dots.querySelectorAll(".modal-dot").forEach((btn) => {
    btn.addEventListener("click", () => {
      modalIdx = parseInt(btn.dataset.idx, 10);
      renderModalSlide();
      updateModalDots();
    });
  });
}

function updateModalDots() {
  document.querySelectorAll(".modal-dot").forEach((dot, i) => {
    dot.classList.toggle("is-active", i === modalIdx);
  });
}

function modalNext() {
  if (modalSlides.length <= 1) return;
  modalIdx = (modalIdx + 1) % modalSlides.length;
  renderModalSlide();
  updateModalDots();
}

function modalPrev() {
  if (modalSlides.length <= 1) return;
  modalIdx = (modalIdx - 1 + modalSlides.length) % modalSlides.length;
  renderModalSlide();
  updateModalDots();
}

function closeModal() {
  const wrap = document.getElementById("modalWrap");
  if (wrap.hidden) return;
  wrap.hidden = true;
  document.body.style.overflow = "";
  document.getElementById("modalViewer").innerHTML = "";
  lastFocus?.focus();
}

function trapFocus(e) {
  const wrap = document.getElementById("modalWrap");
  const els  = [...wrap.querySelectorAll(
    "button:not([disabled]),[href],input,select,textarea,[tabindex]:not([tabindex='-1'])"
  )].filter((el) => !el.closest("[hidden]"));
  if (!els.length) return;
  const first = els[0], last = els[els.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault(); last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault(); first.focus();
  }
}

/* ── Contact form ─────────────────────────────────────────── */
function setupForm() {
  document.getElementById("contactForm").addEventListener("submit", (e) => {
    e.preventDefault();
    /*
     * TODO: connect to form backend.
     * Option A — Formspree: add action="https://formspree.io/f/YOUR_ID" method="POST"
     *            to <form> and remove this handler.
     * Option B — keep this JS handler and POST to your own endpoint.
     */
    const ok = document.getElementById("formOk");
    ok.hidden = false;
    e.target.reset();
    ok.focus();
  });
}

/* ── Utilities ────────────────────────────────────────────── */
function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
