let allData = [];
let top300 = [];
let featured = [];    // currently shown Featured (5)
let expandedItem = null;
let rotationInterval = null;

// CSV path - update if needed
const CSV_PATH = "data/ProductExportTradeMe250817_202019.csv";

// Utilities
function shuffleArray(arr) {
  return arr.slice().sort(() => Math.random() - 0.5);
}

function truncateText(text, length = 260) {
  if (!text) return "";
  return text.length > length ? text.slice(0, length) + "…" : text;
}

// Load CSV
Papa.parse(CSV_PATH, {
  download: true,
  header: true,
  complete: function(results) {
    allData = results.data.filter(item => item.title || item.body || item.start_price || item.stock_amount);

    // Normalize price
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

    // Render everything
    renderFeatured();
    renderAllProducts(allData);

    // Start rotation every 30 seconds
    rotationInterval = setInterval(() => {
      // If there's an expanded item open, still rotate featured row
      featured = pickRandomUniqueFrom(top300, 5);
      renderFeatured(true); // animate
    }, 30000);

    // Search handler (filters allData)
    const searchInput = document.getElementById("search");
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.trim().toLowerCase();
      const filtered = allData.filter(item => {
        const title = (item.title || "").toLowerCase();
        const body = (item.body || "").toLowerCase();
        return title.includes(query) || body.includes(query);
      });
      renderAllProducts(filtered);
    });
  }
});

// Pick n unique random items from source array
function pickRandomUniqueFrom(sourceArr, n) {
  const copy = shuffleArray(sourceArr);
  return copy.slice(0, Math.min(n, copy.length));
}

// Render featured (optionally animate)
function renderFeatured(animate = false) {
  const featuredContainer = document.getElementById("featured-list");
  const expandedContainer = document.getElementById("expanded-container");

  // When rotating with animation: fade-out then replace
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

  // If there is an expanded panel open, make sure it's still displayed below featured
  if (expandedItem) {
    renderExpandedPanel(expandedItem);
  } else {
    // clear expanded container
    expandedContainer.innerHTML = "";
  }
}

// Create a featured card DOM element
function createFeaturedCard(item, index) {
  const div = document.createElement("div");
  div.className = "product";
  div.dataset.featuredIndex = index; // store index for replacement

  const title = item.title || "Untitled";
  // truncation ~260 chars (~4 lines)
  const truncated = truncateText(item.body || "", 260);

  // Determine if "Show more" is needed
  const needsShowMore = (item.body || "").length > 260;

  // Assemble inner HTML
  div.innerHTML = `
    <h2>${escapeHtml(title)}</h2>
    <div class="truncated">${escapeHtml(truncated)}</div>
    ${needsShowMore ? `<div class="show-more" role="button">Show more</div>` : ''}
    <div class="price">${formatPrice(item.start_price)}</div>
  `;

  // Click handler on "Show more" or entire card
  const showMoreEl = div.querySelector(".show-more");
  // If showMore exists, bind click there. If not, allow click on whole card.
  if (showMoreEl) {
    showMoreEl.addEventListener("click", (e) => {
      e.stopPropagation();
      openFeaturedExpanded(item, index);
    });
  } else {
    // The body is short; the user might still want to open it
    div.addEventListener("click", () => openFeaturedExpanded(item, index));
  }

  return div;
}

// Open expanded panel for a featured item
function openFeaturedExpanded(item, featuredIndex) {
  // If already expanded same item, do nothing
  if (expandedItem && expandedItem._uid === item._uid) return;

  // If some other expanded item exists, close it first
  closeExpandedPanel();

  // Remove this item from featured array and replace it with a new one
  replaceFeaturedItem(item);

  // Save expandedItem and render its expanded panel BELOW the featured row
  expandedItem = item;
  renderExpandedPanel(item);
}

// Replace the clicked featured item with a new random top300 item
function replaceFeaturedItem(clickedItem) {
  // find index of the clicked item in current featured
  const idx = featured.findIndex(f => shallowEqualBooks(f, clickedItem));

  // If not found (shouldn't happen), do nothing
  if (idx === -1) return;

  // Choose a replacement from top300 that's not already in featured and not the clicked item
  const currentIds = new Set(featured.map(toUniqueId));
  currentIds.add(toUniqueId(clickedItem)); // ensure clicked excluded
  let replacement = null;
  for (let candidate of shuffleArray(top300)) {
    if (!currentIds.has(toUniqueId(candidate))) {
      replacement = candidate;
      break;
    }
  }

  // If found, replace; otherwise remove slot (unlikely)
  if (replacement) {
    featured[idx] = replacement;
  } else {
    // fallback: remove the slot
    featured.splice(idx, 1);
    // keep featured size 5 by attempting to add any top300 not already present
    for (let candidate of top300) {
      if (!featured.some(f => shallowEqualBooks(f, candidate))) {
        featured.push(candidate);
        break;
      }
    }
  }

  // re-render featured to reflect replacement
  renderFeatured();
}

// Render the expanded panel below featured
function renderExpandedPanel(item) {
  const container = document.getElementById("expanded-container");
  container.innerHTML = "";

  if (!item) return;

  const div = document.createElement("div");
  div.className = "expanded-panel";

  const title = item.title || "Untitled";
  const body = item.body || "No description available.";
  const price = formatPrice(item.start_price);
  let stock = "N/A";
  if (item.stock_amount) {
    const stockNum = parseFloat(item.stock_amount);
    if (!isNaN(stockNum)) stock = Math.round(stockNum).toString();
  }

  div.innerHTML = `
    <h2>${escapeHtml(title)}</h2>
    <p>${escapeHtml(body)}</p>
    <p><strong>Price: ${price}</strong></p>
    <p><em>Stock: ${escapeHtml(stock)}</em></p>
    <a class="close-expanded" role="button">Close</a>
  `;

  // Close handler
  div.querySelector(".close-expanded").addEventListener("click", () => {
    closeExpandedPanel();
  });

  container.appendChild(div);
  // scroll to expanded panel lightly (optional)
  // div.scrollIntoView({behavior: "smooth", block: "center"});
}

// Close and remove expanded panel
function closeExpandedPanel() {
  expandedItem = null;
  const container = document.getElementById("expanded-container");
  container.innerHTML = "";
}

// Render the full product list (all books or filtered)
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
      <div style="position:absolute; right:12px; bottom:12px; font-style:italic; font-size:13px;">Stock: ${escapeHtml(stock)}</div>
    `;

    container.appendChild(div);
  });
}

// Helpers
function formatPrice(num) {
  if (num === null || num === undefined || isNaN(num)) return "N/A";
  return `$${Number(num).toFixed(2)}`;
}

function toUniqueId(item) {
  // try to produce a stable unique id for an item
  return (item && (item.id || item.listing_id || item.title + '||' + (item.start_price || ''))) || JSON.stringify(item);
}

function shallowEqualBooks(a,b) {
  return toUniqueId(a) === toUniqueId(b);
}

// basic HTML escape
function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
