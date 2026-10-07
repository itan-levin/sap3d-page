(() => {
  const C = window.PAGE_CONFIG;
  if (!C) throw new Error("config.js did not define window.PAGE_CONFIG");

  document.title = `${C.method}: ${C.titleRest}`;
  for (const el of document.querySelectorAll("[data-method]")) el.textContent = C.method;
  for (const el of document.querySelectorAll("[data-cfg]")) {
    const value = C[el.dataset.cfg];
    if (Array.isArray(value)) {
      el.textContent = value.join(", ");
      continue;
    }
    if (typeof value !== "string") throw new Error(`config.js has no string or list field "${el.dataset.cfg}"`);
    el.textContent = value;
  }

  for (const el of document.querySelectorAll("[data-link]")) {
    const url = C.links[el.dataset.link];
    if (url === undefined) throw new Error(`config.js links has no field "${el.dataset.link}"`);
    if (url) {
      el.href = url;
    } else {
      el.classList.add("pending");
      el.setAttribute("aria-disabled", "true");
      el.title = "Link coming soon";
    }
  }

  if (!Array.isArray(C.authors) || C.authors.length === 0) throw new Error("config.js authors must be a non-empty list");
  const lastFirst = (name) => {
    const parts = name.trim().split(/\s+/);
    return parts.length < 2 ? name : `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(" ")}`;
  };
  for (const field of ["year", "arxiv"]) {
    if (typeof C.bibtex[field] !== "string" || !C.bibtex[field]) throw new Error(`config.js bibtex.${field} must be a non-empty string`);
  }
  const firstLast = C.authors[0].trim().split(/\s+/).pop().toLowerCase().replace(/[^a-z0-9]/g, "");
  const key = firstLast + C.bibtex.year + C.method.toLowerCase().replace(/[^a-z0-9]/g, "");
  const bib = [
    `@article{${key},`,
    `  title   = {${C.method}: ${C.titleRest}},`,
    `  author  = {${C.authors.map(lastFirst).join(" and ")}},`,
    `  journal = {arXiv preprint arXiv:${C.bibtex.arxiv}},`,
    `  year    = {${C.bibtex.year}}`,
    `}`,
  ].join("\n");
  const code = document.getElementById("bibtex-code");
  code.textContent = bib;

  const copyState = document.getElementById("copy-state");
  document.getElementById("copy-bibtex").addEventListener("click", () => {
    if (!navigator.clipboard) {
      const range = document.createRange();
      range.selectNodeContents(code);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      copyState.textContent = "Clipboard access is unavailable here; the entry is selected, copy it with Ctrl+C or Cmd+C.";
      return;
    }
    navigator.clipboard.writeText(bib).then(
      () => { copyState.textContent = "Copied to the clipboard."; },
      (err) => {
        copyState.textContent = `Copy failed (${err.message}); select the entry and copy it by hand.`;
        console.error(err);
      },
    );
  });

  // Both turntables of a teaser row show one rotation: the result follows the source's clock.
  // The markup keeps `autoplay`, so without this script they still play, each on its own clock.
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  for (const row of document.querySelectorAll(".teaser-row")) {
    const videos = [...row.querySelectorAll("video.turntable")];
    if (videos.length !== 2) throw new Error(`a teaser row holds ${videos.length} turntables, not 2`);
    const [lead, follow] = videos;
    for (const v of videos) {
      v.autoplay = false;
      v.muted = true;
      v.pause();
    }
    let visible = false;
    let held = null;

    // Nothing here seeks: a server without HTTP range support cannot seek reliably, so the two
    // clocks are kept together by pausing and resuming both and by changing the follower's rate.
    const steady = (v) => v.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA && !v.seeking;
    const play = (v) => v.play().catch((err) => {
      if (err.name !== "AbortError") console.error(err);
    });
    function start() {
      if (!visible || reduceMotion.matches || held !== null || !videos.every(steady)) return;
      for (const v of videos) if (v.paused) play(v);
    }
    function stop() {
      held = null;
      for (const v of videos) v.pause();
    }
    for (const v of videos) v.addEventListener("canplay", start);

    new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
      if (visible) start(); else stop();
    }).observe(row);

    reduceMotion.addEventListener("change", () => {
      if (reduceMotion.matches) {
        stop();
        for (const v of videos) v.currentTime = 0;
      } else {
        start();
      }
    });

    function track() {
      const period = lead.duration;
      if (visible && !reduceMotion.matches && period > 0 && videos.every(steady)) {
        let drift = follow.currentTime - lead.currentTime;
        if (drift > period / 2) drift -= period;
        if (drift < -period / 2) drift += period;
        if (held !== null) {
          if (Math.abs(drift) < 0.03) {
            play(held);
            held = null;
          }
        } else if (!lead.paused && !follow.paused) {
          if (Math.abs(drift) > 0.5) {
            follow.playbackRate = 1;
            held = drift > 0 ? follow : lead;
            held.pause();
          } else {
            follow.playbackRate = Math.abs(drift) < 0.01 ? 1 : Math.min(1.15, Math.max(0.85, 1 - 2 * drift));
          }
        }
      }
      requestAnimationFrame(track);
    }
    requestAnimationFrame(track);
  }

  // The viewer page has a 1000 px minimum width, so narrower screens get a static figure and a link instead.
  const wide = window.matchMedia("(min-width: 1060px)");
  const slot = document.getElementById("viewer-slot");
  let frame = null;
  let frameLoaded = false;

  function viewerUrl(caseId) {
    return caseId ? `${C.viewer}#${caseId}` : C.viewer;
  }

  function ensureFrame(caseId) {
    if (frame === null) {
      frame = document.createElement("iframe");
      frame.title = "Interactive 3D comparison";
      frame.src = viewerUrl(caseId);
      frame.addEventListener("load", () => {
        frameLoaded = true;
        slot.classList.add("ready");
      });
      slot.prepend(frame);
      return;
    }
    if (!caseId) return;
    if (frameLoaded) frame.contentWindow.location.hash = caseId;
    else frame.src = viewerUrl(caseId);
  }

  function nearViewport(el) {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight + 800 && r.bottom > -800;
  }

  const observer = new IntersectionObserver((entries) => {
    if (wide.matches && entries.some((e) => e.isIntersecting)) ensureFrame();
    if (frame !== null) observer.disconnect();
  }, { rootMargin: "800px 0px" });
  observer.observe(slot);

  wide.addEventListener("change", () => {
    if (wide.matches && frame === null && nearViewport(slot)) ensureFrame();
  });

  for (const a of document.querySelectorAll("[data-viewer-link]")) a.href = viewerUrl();

  for (const a of document.querySelectorAll(".to-viewer")) {
    a.href = viewerUrl(a.dataset.case);
    a.target = "_blank";
    a.rel = "noopener";
    a.addEventListener("click", (ev) => {
      if (!wide.matches) return;
      ev.preventDefault();
      ensureFrame(a.dataset.case);
      document.getElementById("comparison").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
})();
