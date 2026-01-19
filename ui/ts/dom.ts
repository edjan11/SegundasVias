// @ts-nocheck
export function byId(id) {
  return document.getElementById(id);
}

export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

export function debounce(fn, waitMs) {
  let timer = null;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), waitMs);
  };
}

export function setText(el, text) {
  if (!el) return;
  el.textContent = text;
}

export function setVisible(el, visible) {
  if (!el) return;
  el.style.display = visible ? '' : 'none';
  el.classList.toggle('visible', !!visible);
}
