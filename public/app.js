// Progressive enhancement only. All records are rendered into index.html by
// scripts/render.mjs, so this script never fetches and never renders content —
// it filters, orders and links what is already on the page. With JavaScript off
// the directory is complete, grouped by category, with working links.

const $ = (s) => document.querySelector(s);
const root = $("#results");

if (root) {
  const records = Array.prototype.slice.call(root.querySelectorAll(".record"));
  const controls = { q: $("#search"), cat: $("#category"), link: $("#link"), sort: $("#sort") };
  const summary = $("#summary");
  const empty = $("#empty");
  const order = records.map((node) => node.dataset.id);

  function writeUrl() {
    const params = new URLSearchParams();
    if (controls.q.value) params.set("q", controls.q.value);
    if (controls.cat.value) params.set("cat", controls.cat.value);
    if (controls.link.value) params.set("link", controls.link.value);
    if (controls.sort.value && controls.sort.value !== "category") params.set("sort", controls.sort.value);
    const query = params.toString();
    history.replaceState(null, "", (query ? "?" + query : location.pathname) + location.hash);
  }

  function apply() {
    const q = controls.q.value.trim().toLowerCase();
    let shown = 0;
    records.forEach((node) => {
      const ok = (!q || node.dataset.text.indexOf(q) !== -1)
        && (!controls.cat.value || node.dataset.category === controls.cat.value)
        && (!controls.link.value || node.dataset.link === controls.link.value);
      node.hidden = !ok;
      if (ok) shown += 1;
    });
    const mode = controls.sort.value;
    records.slice().sort((a, b) => {
      if (mode === "name") return a.dataset.name.localeCompare(b.dataset.name);
      if (mode === "name-desc") return b.dataset.name.localeCompare(a.dataset.name);
      if (mode === "id") return a.dataset.id.localeCompare(b.dataset.id, undefined, { numeric: true });
      return order.indexOf(a.dataset.id) - order.indexOf(b.dataset.id);
    }).forEach((node) => root.appendChild(node));
    const scope = controls.cat.value ? " in " + controls.cat.value : "";
    summary.textContent = shown + " of " + records.length + " records shown" + scope + ".";
    empty.hidden = shown !== 0;
    writeUrl();
  }

  $("#filters").addEventListener("submit", (event) => event.preventDefault());
  controls.q.addEventListener("input", apply);
  ["cat", "link", "sort"].forEach((key) => controls[key].addEventListener("change", apply));

  $("#clear").addEventListener("click", () => {
    controls.q.value = ""; controls.cat.value = ""; controls.link.value = ""; controls.sort.value = "category";
    apply();
  });

  const share = $("#share");
  if (navigator.clipboard && share) {
    share.hidden = false;
    share.addEventListener("click", () => {
      navigator.clipboard.writeText(location.href).then(() => {
        summary.textContent = "Link to this view copied to the clipboard.";
      }, () => {
        summary.textContent = "The browser refused clipboard access; copy the address bar instead.";
      });
    });
  }

  const params = new URLSearchParams(location.search);
  if (params.get("q")) controls.q.value = params.get("q");
  if (params.get("cat")) controls.cat.value = params.get("cat");
  if (params.get("link")) controls.link.value = params.get("link");
  if (params.get("sort")) controls.sort.value = params.get("sort");
  apply();

  if (location.hash) {
    const target = document.querySelector(location.hash);
    if (target && target.hidden) $("#clear").click();
    if (target) target.scrollIntoView();
  }
}
