const API_URL = "https://fakestoreapi.com/products";

const TAX_RATE = 0.05;
const SHIPPING_FEE = 50;
const FREE_SHIPPING_MINIMUM = 1000;

const productGrid = document.getElementById("product-grid");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const categoryFilters = document.getElementById("category-filters");
const statusMessage = document.getElementById("status-message");

const cartButton = document.getElementById("cart-button");
const cartCount = document.getElementById("cart-count");
const cartDrawer = document.getElementById("cart-drawer");
const drawerOverlay = document.getElementById("drawer-overlay");
const closeCartButton = document.getElementById("close-cart");
const cartItems = document.getElementById("cart-items");

const subtotalElement = document.getElementById("cart-subtotal");
const taxElement = document.getElementById("cart-tax");
const shippingElement = document.getElementById("cart-shipping");
const totalElement = document.getElementById("cart-total");
const checkoutButton = document.getElementById("checkout-button");

const checkoutModal = document.getElementById("checkout-modal");
const modalCloseButton = document.getElementById("close-modal");
const continueShoppingButton = document.getElementById(
  "continue-shopping"
);
const orderSummary = document.getElementById("order-summary");

let allProducts = [];
let activeCategory = "all";
let searchTerm = "";
let cart = loadCart();

function loadCart() {
  try {
    const savedCart = JSON.parse(
      localStorage.getItem("shopflow-cart") || "[]"
    );

    if (!Array.isArray(savedCart)) return [];

    return savedCart
      .filter(
        (item) =>
          item &&
          Number.isInteger(item.id) &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0 &&
          Number.isFinite(item.price) &&
          item.price >= 0
      )
      .map((item) => ({
        id: item.id,
        title: String(item.title || "Product"),
        price: item.price,
        image: String(item.image || ""),
        quantity: item.quantity,
      }));
  } catch {
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem("shopflow-cart", JSON.stringify(cart));
  } catch {
    showStatus("Unable to save your cart in this browser.", true);
  }
}

function showStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
}

function formatPrice(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

function getCategory(product) {
  const category = String(product.category || "").toLowerCase();

  if (category.includes("electronics")) return "electronics";
  if (category.includes("jewel")) return "jewelery";
  if (category.includes("men") || category.includes("women")) {
    return "clothing";
  }

  return "other";
}

function getCategoryLabel(category) {
  const labels = {
    electronics: "Electronics",
    jewelery: "Jewelry",
    clothing: "Clothing",
    other: "Other",
  };

  return labels[category] || "Other";
}

async function fetchProducts() {
  productGrid.innerHTML = "";
  showStatus("Loading products...");

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error("Unable to load products. Please try again.");
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("The product service returned invalid data.");
    }

    allProducts = data.filter(
      (product) =>
        Number.isFinite(Number(product.id)) &&
        Number.isFinite(Number(product.price)) &&
        product.title &&
        product.image
    );

    if (allProducts.length === 0) {
      throw new Error("No products are currently available.");
    }

    showStatus("");
    renderProducts();
  } catch (error) {
    productGrid.innerHTML = "";
    showStatus(
      error instanceof TypeError
        ? "Network error. Check your internet connection and try again."
        : error.message,
      true
    );

    productGrid.innerHTML = `
      <p class="muted">
        Products could not be loaded.
        <button class="primary-button" id="retry-products">
          Try again
        </button>
      </p>
    `;

    document
      .getElementById("retry-products")
      ?.addEventListener("click", fetchProducts);
  }
}

function renderProducts() {
  const filteredProducts = allProducts.filter((product) => {
    const matchesCategory =
      activeCategory === "all" ||
      getCategory(product) === activeCategory;

    const matchesSearch = String(product.title)
      .toLowerCase()
      .includes(searchTerm);

    return matchesCategory && matchesSearch;
  });

  if (filteredProducts.length === 0) {
    productGrid.innerHTML = `
      <p class="muted">No products found. Try another search.</p>
    `;
    return;
  }

  productGrid.innerHTML = filteredProducts
    .map((product) => {
      const id = Number(product.id);
      const title = escapeHTML(product.title);
      const image = escapeHTML(product.image);
      const category = getCategory(product);
      const rating = Number(product.rating?.rate || 0);
      const ratingCount = Number(product.rating?.count || 0);

      return `
        <article class="product-card">
          <div class="product-image-wrap">
            <span class="product-badge">
              ${escapeHTML(getCategoryLabel(category))}
            </span>
            <img
              class="product-image"
              src="${image}"
              alt="${title}"
              loading="lazy"
            >
          </div>

          <div class="product-info">
            <p class="product-category">
              ${escapeHTML(product.category)}
            </p>

            <h3 class="product-title">${title}</h3>

            <p class="product-rating">
              ★ ${rating.toFixed(1)}
              <span class="muted">(${ratingCount} reviews)</span>
            </p>

            <div class="product-bottom">
              <span class="product-price">
                ${formatPrice(Number(product.price))}
              </span>

              <button
                class="add-button"
                data-add="${id}"
                aria-label="Add ${title} to cart"
                title="Add to cart"
              >+</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function addToCart(productId) {
  const product = allProducts.find(
    (item) => Number(item.id) === productId
  );

  if (!product) return;

  const existingItem = cart.find((item) => item.id === productId);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      id: productId,
      title: product.title,
      price: Number(product.price),
      image: product.image,
      quantity: 1,
    });
  }

  saveCart();
  renderCart();
  openCart();
}

function updateQuantity(productId, change) {
  const item = cart.find((product) => product.id === productId);

  if (!item) return;

  item.quantity += change;

  if (item.quantity <= 0) {
    removeFromCart(productId);
    return;
  }

  saveCart();
  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter((item) => item.id !== productId);
  saveCart();
  renderCart();
}

function calculateTotal() {
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const tax = subtotal * TAX_RATE;
  const shipping =
    subtotal === 0 || subtotal >= FREE_SHIPPING_MINIMUM
      ? 0
      : SHIPPING_FEE;

  return {
    subtotal,
    tax,
    shipping,
    total: subtotal + tax + shipping,
  };
}

function renderCart() {
  const itemCount = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  cartCount.textContent = itemCount;
  cartCount.setAttribute("aria-label", `${itemCount} items in cart`);

  if (cart.length === 0) {
    cartItems.innerHTML = `
      <div class="empty-cart">
        <p style="font-size: 36px;">🛒</p>
        <h3>Your cart is empty</h3>
        <p class="muted">Add something you love!</p>
      </div>
    `;
  } else {
    cartItems.innerHTML = cart
      .map(
        (item) => `
          <article class="cart-item">
            <img
              src="${escapeHTML(item.image)}"
              alt="${escapeHTML(item.title)}"
            >

            <div>
              <h3>${escapeHTML(item.title)}</h3>

              <p class="cart-item-price">
                ${formatPrice(item.price * item.quantity)}
              </p>

              <div class="quantity-controls">
                <button
                  data-quantity="${item.id}"
                  data-change="-1"
                  aria-label="Decrease quantity"
                >−</button>

                <span>${item.quantity}</span>

                <button
                  data-quantity="${item.id}"
                  data-change="1"
                  aria-label="Increase quantity"
                >+</button>
              </div>
            </div>

            <button
              class="remove-button"
              data-remove="${item.id}"
              aria-label="Remove ${escapeHTML(item.title)}"
            >Remove</button>
          </article>
        `
      )
      .join("");
  }

  const totals = calculateTotal();

  subtotalElement.textContent = formatPrice(totals.subtotal);
  taxElement.textContent = formatPrice(totals.tax);
  shippingElement.textContent = formatPrice(totals.shipping);
  totalElement.textContent = formatPrice(totals.total);

  checkoutButton.disabled = cart.length === 0;
}

function openCart() {
  cartDrawer.classList.add("open");
  drawerOverlay.classList.add("open");
  document.body.classList.add("drawer-open");

  cartDrawer.setAttribute("aria-hidden", "false");
  cartButton.setAttribute("aria-expanded", "true");
  closeCartButton.focus();
}

function closeCart() {
  cartDrawer.classList.remove("open");
  drawerOverlay.classList.remove("open");
  document.body.classList.remove("drawer-open");

  cartDrawer.setAttribute("aria-hidden", "true");
  cartButton.setAttribute("aria-expanded", "false");
  cartButton.focus();
}

function openCheckoutModal() {
  if (cart.length === 0) return;

  const totals = calculateTotal();
  const orderNumber = `SF-${Date.now().toString().slice(-8)}`;

  orderSummary.textContent =
    `Order ${orderNumber} · ${cart.reduce(
      (sum, item) => sum + item.quantity,
      0
    )} item(s) · ${formatPrice(totals.total)}`;

  closeCart();

  checkoutModal.hidden = false;
  document.body.classList.add("drawer-open");

  cart = [];
  saveCart();
  renderCart();

  modalCloseButton.focus();
}

function closeCheckoutModal() {
  checkoutModal.hidden = true;
  document.body.classList.remove("drawer-open");
  cartButton.focus();
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  searchTerm = searchInput.value.trim().toLowerCase();
  renderProducts();
});

categoryFilters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");

  if (!button) return;

  activeCategory = button.dataset.category;

  categoryFilters.querySelectorAll("[data-category]").forEach((item) => {
    const isActive = item === button;
    item.classList.toggle("active", isActive);
    item.setAttribute("aria-pressed", String(isActive));
  });

  renderProducts();
});

productGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add]");

  if (button) {
    addToCart(Number(button.dataset.add));
  }
});

cartItems.addEventListener("click", (event) => {
  const quantityButton = event.target.closest("[data-quantity]");
  const removeButton = event.target.closest("[data-remove]");

  if (quantityButton) {
    updateQuantity(
      Number(quantityButton.dataset.quantity),
      Number(quantityButton.dataset.change)
    );
  }

  if (removeButton) {
    removeFromCart(Number(removeButton.dataset.remove));
  }
});

cartButton.addEventListener("click",openCart);
closeCartButton.addEventListener("click", closeCart);
drawerOverlay.addEventListener("click", closeCart);
checkoutButton.addEventListener("click", openCheckoutModal);
modalCloseButton.addEventListener("click", closeCheckoutModal);
continueShoppingButton.addEventListener("click", closeCheckoutModal);

checkoutModal.addEventListener("click", (event) => {
  if (event.target === checkoutModal) {
    closeCheckoutModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!checkoutModal.hidden) {
      closeCheckoutModal();
    } else if (cartDrawer.classList.contains("open")) {
      closeCart();
    }
  }
});

fetchProducts();
renderCart();