/* =============================================
   RE-COLLECTIBLES BOOKSHOP — script.js
   ============================================= */

let allData = [];
let top300 = [];
let featured = [];
let expandedItems = [];
let rotationInterval = null;

const CSV_PATH = "EXPORT10-5-26.csv";

/* ---- Utilities ---- */
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function truncateText(text, length = 220) {
  if (!text) return "";
  return text.length > length ? text.slice(0, length) + "…" : text;
}

function formatPrice(num) {
  if (num === null || num === undefined || isNaN(num)) return "N/A";
  return `$${Number(num).toFixed(2)}`;
}

function toUniqueId(item) {
  return (item && (item.id || item.listing_id || (item.title || '') + '||' + (item.start_price || ''))) || JSON.stringify(item);
}

function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ---- Total stock ---- */
function computeAndShowTotalStock(dataArray) {
  let total = 0;
  dataArray.forEach(item => {
    const n = parseFloat(item.stock_amount);
    if (!isNaN(n)) total += n;
  });
  total = Math.round(total);
  const el = document.getElementById("total-stock");
  if (el) el.textContent = `${total.toLocaleString()} items in catalogue`;
}

/* ---- Load CSV ---- */
Papa.parse(CSV_PATH, {
  download: true,
  header: true,
  complete: function(results) {
    allData = results.data.filter(item => item.title || item.body || item.start_price || item.stock_amount);

    allData.forEach(item => {
      if (item.start_price) {
        item.start_price = parseFloat(item.start_price.toString().replace(/[^0-9.]/g, "")) || 0;
      } else {
        item.start_price = 0;
      }
      if (item.stock_amount !== undefined && item.stock_amount !== null) {
        const s = parseFloat(String(item.stock_amount).replace(/[^0-9.-]/g, ""));
        if (!isNaN(s)) item.stock_amount = Math.round(s);
      }
    });

    computeAndShowTotalStock(allData);
    updateSearchCount(allData.length, false);

    top300 = [...allData].sort((a, b) => b.start_price - a.start_price).slice(0, 300);
    featured = pickRandomUniqueFrom(top300, 5);

    renderFeatured();

    const randomizedAllDisplay = shuffleArray(allData);
    renderAllProducts(randomizedAllDisplay);

    rotationInterval = setInterval(() => {
      featured = pickRandomUniqueFrom(top300, 5);
      renderFeatured(true);
    }, 30000);

    const searchInput = document.getElementById("search");
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.trim().toLowerCase();
      if (!query) {
        const randomizedAllDisplay = shuffleArray(allData);
        renderAllProducts(randomizedAllDisplay);
        updateSearchCount(allData.length, false);
        return;
      }
      const filtered = allData.filter(item => {
        const title = (item.title || "").toLowerCase();
        const body = (item.body || "").toLowerCase();
        return title.includes(query) || body.includes(query);
      });
      const randomizedFiltered = shuffleArray(filtered);
      renderAllProducts(randomizedFiltered);
      updateSearchCount(filtered.length, true, query);
    });

    document.getElementById("clear-search").addEventListener("click", () => {
      searchInput.value = "";
      const randomizedAllDisplay = shuffleArray(allData);
      renderAllProducts(randomizedAllDisplay);
      updateSearchCount(allData.length, false);
      searchInput.focus();
    });
  },
  error: function() {
    const container = document.getElementById("product-list");
    if (container) container.innerHTML = `<p class="no-results">Could not load catalogue. Please check your data file path.</p>`;
    const el = document.getElementById("total-stock");
    if (el) el.textContent = "Catalogue unavailable";
  }
});

/* ---- Search count helper ---- */
function updateSearchCount(count, isFiltered, query = "") {
  const el = document.getElementById("search-count");
  if (!el) return;
  if (!isFiltered) {
    el.textContent = "";
    return;
  }
  if (count === 0) {
    el.textContent = `No results found for "${query}"`;
  } else {
    el.textContent = `${count.toLocaleString()} result${count !== 1 ? "s" : ""} for "${query}"`;
  }
}

/* ---- Helpers ---- */
function pickRandomUniqueFrom(sourceArr, n) {
  const copy = shuffleArray(sourceArr);
  return copy.slice(0, Math.min(n, copy.length));
}

function renderFeatured(animate = false) {
  const featuredContainer = document.getElementById("featured-list");
  if (animate) {
    featuredContainer.classList.add("fade-out");
    setTimeout(() => {
      featuredContainer.classList.remove("fade-out");
      featuredContainer.innerHTML = "";
      featured.forEach((item, idx) => {
        featuredContainer.appendChild(createFeaturedCard(item, idx));
      });
    }, 700);
    return;
  }
  featuredContainer.innerHTML = "";
  featured.forEach((item, idx) => {
    featuredContainer.appendChild(createFeaturedCard(item, idx));
  });
}

function createFeaturedCard(item, index) {
  const div = document.createElement("div");
  div.className = "product";
  div.dataset.featuredIndex = index;
  div.style.animationDelay = `${index * 60}ms`;

  const title = item.title || "Untitled";
  const truncated = truncateText(item.body || "", 220);

  div.innerHTML = `
    <h2>${escapeHtml(title)}</h2>
    <div class="truncated">${escapeHtml(truncated)}</div>
    <div class="show-more" role="button" tabindex="0">Read more</div>
    <div class="price">${formatPrice(item.start_price)}</div>
  `;

  const showMore = div.querySelector(".show-more");
  showMore.addEventListener("click", (e) => {
    e.stopPropagation();
    appendExpandedItem(item);
  });
  showMore.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      appendExpandedItem(item);
    }
  });

  return div;
}

function appendExpandedItem(item) {
  const id = toUniqueId(item);
  if (expandedItems.some(x => toUniqueId(x) === id)) {
    const existingEl = document.querySelector(`#expanded-list .expanded-card[data-id="${encodeURIComponent(id)}"]`);
    if (existingEl) existingEl.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  expandedItems.push(item);
  renderExpandedList();
}

/* =========================
   CHANGE #1 — CLOSE BUTTON
   ========================= */
function renderExpandedList() {
  const container = document.getElementById("expanded-list");
  container.innerHTML = "";

  expandedItems.forEach(item => {
    const id = toUniqueId(item);
    const div = document.createElement("div");
    div.className = "product featured-expanded expanded-card";
    div.dataset.id = encodeURIComponent(id);

    const title = item.title || "Untitled";
    const body = item.body || "No description available.";
    const price = formatPrice(item.start_price);

    let stock = "N/A";
    if (item.stock_amount !== undefined && item.stock_amount !== null) {
      const stockNum = parseFloat(item.stock_amount);
      if (!isNaN(stockNum)) stock = Math.round(stockNum).toString();
    }

    div.innerHTML = `
      <button class="close-btn" data-close-id="${encodeURIComponent(id)}">✕ Close</button>
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(body)}</p>
      <div class="price">${price}</div>
      <div class="stock-right">Stock: ${escapeHtml(stock)}</div>
    `;

    container.appendChild(div);

    div.querySelector('.close-btn').addEventListener('click', () => {
      expandedItems = expandedItems.filter(x => toUniqueId(x) !== id);
      renderExpandedList();
    });
  });

  const last = container.lastElementChild;
  if (last) last.scrollIntoView({ behavior: "smooth", block: "center" });
}

/* =========================
   CHANGE #2 + #3
   ========================= */
function renderAllProducts(products) {
  const container = document.getElementById("product-list");
  container.innerHTML = "";

  if (!products || products.length === 0) {
    container.innerHTML = `<p class="no-results">No items found. Try a different search term.</p>`;
    return;
  }

  const CHUNK = 100;
  let offset = 0;

  function renderChunk() {
    const slice = products.slice(offset, offset + CHUNK);
    slice.forEach(p => {
      const div = document.createElement("div");
      div.className = "product";

      const title = p.title || "Untitled";
      const body = p.body || "";
      const price = formatPrice(p.start_price);

      let stock = "N/A";
      if (p.stock_amount !== undefined && p.stock_amount !== null) {
        const stockNum = parseFloat(p.stock_amount);
        if (!isNaN(stockNum)) stock = Math.round(stockNum).toString();
      }

      /* CHANGE #2 */
      div.innerHTML = `
        <h2>${escapeHtml(title)}</h2>
        <div class="truncated">${escapeHtml(truncateText(body, 220))}</div>
        <div class="show-more" role="button" tabindex="0">Read more</div>
        <div class="price">${price}</div>
        <div class="stock-right">Stock: ${escapeHtml(stock)}</div>
      `;

      /* CHANGE #3 */
      div.querySelector('.show-more').addEventListener('click', () => {
        const existingPanel = div.nextElementSibling;
        if (existingPanel && existingPanel.classList.contains('catalogue-expanded-panel')) {
          existingPanel.remove();
          return;
        }

        document.querySelectorAll('.catalogue-expanded-panel').forEach(el => el.remove());

        const panel = document.createElement('div');
        panel.className = 'catalogue-expanded-panel';
        panel.innerHTML = `
          <button class="close-btn">✕ Close</button>
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(body)}</p>
          <div class="price">${price}</div>
          <div class="stock-right">Stock: ${escapeHtml(stock)}</div>
        `;

        panel.querySelector('.close-btn').addEventListener('click', () => panel.remove());
        div.after(panel);
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });

      container.appendChild(div);
    });

    offset += CHUNK;
    if (offset < products.length) {
      requestAnimationFrame(renderChunk);
    }
  }

  renderChunk();
}
