/* Globals */
let allData = [];
let top300 = [];
let featured = [];          // currently shown Featured (5)
let expandedItems = [];     // multiple expanded items appended below featured
let rotationInterval = null;

/* CSV path (adjust if needed) */
const CSV_PATH = "data/ProductExportTradeMe250928_151739.csv";

/* Utilities */
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function truncateText(text, length = 260) {
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

/* Compute total stock and show */
function computeAndShowTotalStock(dataArray) {
  let total = 0;
  dataArray.forEach(item => {
    const n = parseFloat(item.stock_amount);
    if (!isNaN(n)) total += n;
  });
  total = Math.round(total);
  const el = document.getElementById("total-stock");
  if (el) el.textContent = `Total stock: ${total}`;
}

/* Load CSV */
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

    top300 = [...allData].sort((a,b) => b.start_price - a.start_price).slice(0, 300);
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
      const filtered = allData.filter(item => {
        const title = (item.title || "").toLowerCase();
        const body = (item.body || "").toLowerCase();
        return title.includes(query) || body.includes(query);
      });
      const randomizedFiltered = shuffleArray(filtered);
      renderAllProducts(randomizedFiltered);
    });

    // Clear search button
    document.getElementById("clear-search").addEventListener("click", () => {
      searchInput.value = "";
      const randomizedAllDisplay = shuffleArray(allData);
      renderAllProducts(randomizedAllDisplay);
    });
  }
});

/* Helpers */
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
    }, 900);
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

  const title = item.title || "Untitled";
  const truncated = truncateText(item.body || "", 260);

  div.innerHTML = `
    <h2>${escapeHtml(title)}</h2>
    <div class="truncated">${escapeHtml(truncated)}</div>
    <div class="show-more" role="button">Show more</div>
    <div class="price">${formatPrice(item.start_price)}</div>
  `;

  div.querySelector(".show-more").addEventListener("click", (e) => {
    e.stopPropagation();
    appendExpandedItem(item);
  });

  return div;
}

function appendExpandedItem(item) {
  const id = toUniqueId(item);
  if (expandedItems.some(x => toUniqueId(x) === id)) {
    const existingEl = document.querySelector(`#expanded-list .expanded-card[data-id="${encodeURIComponent(id)}"]`);
    if (existingEl) existingEl.scrollIntoView({behavior: "smooth", block: "center"});
    return;
  }
  expandedItems.push(item);
  renderExpandedList();
}

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
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(body)}</p>
      <div class="price">${price}</div>
      <div class="stock-right">Stock: ${escapeHtml(stock)}</div>
    `;

    container.appendChild(div);
  });

  const last = container.lastElementChild;
  if (last) last.scrollIntoView({behavior: "smooth", block: "center"});
}

function renderAllProducts(products) {
  const container = document.getElementById("product-list");
  container.innerHTML = "";

  if (!products || products.length === 0) {
    container.innerHTML = "<p>No results found.</p>";
    return;
  }

  products.forEach(p => {
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

    div.innerHTML = `
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(body)}</p>
      <div class="price">${price}</div>
      <div class="stock-right">Stock: ${escapeHtml(stock)}</div>
    `;

    container.appendChild(div);
  });
}
