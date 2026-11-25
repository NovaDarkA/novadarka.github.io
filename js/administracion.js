(() => {
  const links = [...document.querySelectorAll("[data-module]")];
  const panels = [...document.querySelectorAll("[data-module-panel]")];
  const activate = () => {
    const requested = location.hash.slice(1);
    const selected = panels.some(p => p.id === requested) ? requested : "productos";
    for (const panel of panels) panel.hidden = panel.id !== selected;
    for (const link of links) {
      if (link.dataset.module === selected) link.setAttribute("aria-current","true");
      else link.removeAttribute("aria-current");
    }
  };
  window.addEventListener("hashchange",activate);
  activate();
})();
