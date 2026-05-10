/* =============================================
   RE-COLLECTIBLES BOOKSHOP — new-listings.js
   ============================================= */

let allData = [];
let newListings = [];

const CSV_PATH = "data/ProductExportTradeMe260408_164022.csv";
const LAST_UPLOAD_KEY = "re-collectibles-last-upload";

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

function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatLastUpdated(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('en-NZ', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
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

/* ---- Load CSV & Track Upload ---- */
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

    // Get previous upload timestamp
    const lastUploadTime = localStorage.getItem(LAST_UPLOAD_KEY);
    const currentTime = Date.now();

    // If first time or last upload was more than 1 hour ago, treat all as new
    if (!lastUploadTime || (currentTime - parseInt(lastUploadTime)) > 3600000) {
      newListings = allData;
    } else {
      // All products are new since last upload
      newListings = allData;
    }

    // Update the upload timestamp
    localStorage.setItem(LAST_UPLOAD_KEY, currentTime.toString());

    // Display last updated time
    displayLastUpdated(currentTime);

    updateSearchCount(newListings.length, false);
    renderNewListings(shuffleArray(newListings));

    // Search functionality
    const searchInput = document.getElementById("search");
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.trim().toLowerCase();
      if (!query) {
        renderNewListings(shuffleArray(newListings));
        updateSearchCount(newListings.length, false);
        return;
      }
      const filtered = newListings.filter(item => {
        const title = (item.title || "").toLowerCase();
        const body = (item.body || "").toLowerCase();
        return title.includes(query) || body.includes(query);
      });
      const randomizedFiltered = shuffleArray(filtered);
      renderNewListings(randomizedFiltered);
      updateSearchCount(filtered.length, true, query);
    });

    document.getElementById("clear-search").addEventListener("click", () => {
      searchInput.value = "";
      renderNewListings(shuffleArray(newListings));
      updateSearchCount(newListings.length, false);
      searchInput.focus();
    });
  },
  error: function() {
    const container = document.getElementById("new-product-list");
    if (container) container.innerHTML = `<p class="no-results">Could not load catalogue. Please check your data file path.</p>`;
    const el = document.getElementById("total-stock");
    if (el) el.textContent = "Catalogue unavailable";
  }
});

/* ---- Display Last Updated ---- */
function displayLastUpdated(timestamp) {
  const el = document.getElementById("last-updated");
  if (el) {
    el.textContent = `Updated: ${formatLastUpdated(timestamp)}`;
  }
}

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

/* ---- Render New Listings ---- */
function renderNewListings(products) {
  const container = document.getElementById("new-product-list");
  container.innerHTML = "";

  if (!products || products.length === 0) {
    container.innerHTML = `
      <div class="no-new-listings">
        <p>No new listings at this time.</p>
        <p><a href="index.html" class="back-link">Browse the full catalogue →</a></p>
      </div>
    `;
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

      div.innerHTML = `
        <h2>${escapeHtml(title)}</h2>
        <div class="truncated">${escapeHtml(truncateText(body, 220))}</div>
        <div class="show-more" role="button" tabindex="0">Read more</div>
        <div class="price">${price}</div>
        <div class="stock-right">Stock: ${escapeHtml(stock)}</div>
      `;

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
