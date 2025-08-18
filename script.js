/* Globals */
let allData = [];
let top300 = [];
let featured = [];          // currently shown Featured (5)
let expandedItems = [];     // multiple expanded items appended below featured
let rotationInterval = null;

/* CSV path (adjust if needed) */
const CSV_PATH = "data/ProductExportTradeMe250817_202019.csv";

/* Utilities */
function shuffleArray(arr) {
  return arr.slice().sort(() => Math.random() - 0.5);
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

/* Load CSV */
Papa.parse(CSV_PATH, {
  download: true,
  header: true,
  complete: function(results) {
    allData = results.data.filter(item => item.title || item.body || item.start_price || item.stock_amount);

    // Normalize price numbers
    allData.forEach(item => {
      if (item.start_price) {
        item.start_price = parseFloat(item.start_price.toString().replace(/[^0-9.]/g, "")) || 0;
      } else {
        item.start_price = 0;
      }
    });

    // Top 300 by price for featured selection
    top300 = [...allData].sort((a,b) => b.start_price - a.start_price).slice(0, 300);

    // Initialize featured (5 random unique from top300)
    featured = pickRandomUniqueFrom(top300, 5);

    // Render featured
    renderFeatured();

    // --- NEW: Render ALL products in a random order on each page load ---
    const randomizedAllDisplay = shuffleArray(allData);
    renderAllProducts(randomizedAllDisplay);
    // -------------------------------------------------------------------

    // Start rotation every 30s (keeps replacing entire featured set)
    rotationInterval = setInterval(() => {
      featured = pickRandomUniqueFrom(top300, 5);
      renderFeatured(true);
    }, 30000);

    // Search handler filters ALL products below; show results in randomized order
    const searchInput = document.getElementById("search");
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.trim().toLowerCase();
      const filtered = allData.filter(item => {
        const title = (item.title || "").toLowerCase();
        const body = (item.body || "").toLowerCase();
        return title.includes(query) || body.includes(query);
      });
      // Shuffle filtered results so search view is randomized too
      const randomizedFiltered = shuffleArray(filtered);
      renderAllProducts(randomizedFiltered);
    });
  }
});

/* Pick n unique random items from source array */
function pickRandomUniqueFrom(sourceArr, n) {
  const copy = shuffleArray(sourceArr);
  return copy.slice(0, Math.min(n, copy.length));
}

/* Render featured (optionally animate) */
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

  // Normal render
  featuredContainer.innerHTML = "";
  featured.forEach((item, idx) => {
    featuredContainer.appendChild(createFeaturedCard(item, idx));
  });
}

/* Create a single featured card DOM element (compact view) */
function createFeaturedCard(item, index) {
  const div = document.createElement("div");
  div.className = "product";
  div.dataset.featuredIndex = index;

  const title = item.title || "Untitled";
  const truncated = truncateText(item.body || "", 260);
  // Always show "Show more"
  const needsShowMore = true;

  div.innerHTML = `
    <h2>${escapeHtml(title)}</h2>
    <div class="truncated">${escapeHtml(truncated)}</div>
    ${needsShowMore ? `<div class="show-more" role="button">Show more</div>` : ''}
    <div class="price">${formatPrice(item.start_price)}</div>
  `;

  // Bind show-more to append expanded full card below featured
  const showMoreEl = div.querySelector(".show-more");
  showMoreEl.addEventListener("click", (e) => {
    e.stopPropagation();
    appendExpandedItem(item);
  });

  return div;
}

/* Append expanded full card below featured (multiple allowed) */
function appendExpandedItem(item) {
  // avoid duplicates: if this item is already expanded, scroll to it
  const id = toUniqueId(item);
  if (expandedItems.some(x => toUniqueId(x) === id)) {
    const existingEl = document.querySelector(`#expanded-list .expanded-card[data-id="${encodeURIComponent(id)}"]`);
    if (existingEl) existingEl.scrollIntoView({behavior: "smooth", block: "center"});
    return;
  }

  // Add to expanded list and render
  expandedItems.push(item);
  renderExpandedList();
}

/* Render expanded list (all appended expanded cards)
   Each expanded card uses the SAME HTML structure as the main list items,
   but gets .featured-expanded class so it keeps the featured color/border.
*/
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
    if (item.stock_amount) {
      const stockNum = parseFloat(item.stock_amount);
      if (!isNaN(stockNum)) stock = Math.round(stockNum).toString();
    }

    /* Use the same DOM structure as renderAllProducts so visuals match */
    div.innerHTML = `
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(body)}</p>
      <div class="price">${price}</div>
      <div class="stock-right">Stock: ${escapeHtml(stock)}</div>
    `;

    container.appendChild(div);
  });

  // scroll to the last appended card for convenience
  const last = container.lastElementChild;
  if (last) last.scrollIntoView({behavior: "smooth", block: "center"});
}

/* Render main product list (full dataset or filtered) */
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
    if (p.stock_amount) {
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
