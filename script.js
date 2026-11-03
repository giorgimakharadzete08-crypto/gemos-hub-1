(() => {
    "use strict";

    const storageKey = "gemos-hub-cart-v1";
    const whatsappNumber = "995511304011";
    const cart = new Map();
    let toastTimer;
    const currentPage = window.location.pathname.split("/").pop();

    if ((currentPage === "" || currentPage === "index.html") && !window.location.hash) {
        window.location.hash = "menu";
    }

    const formatPrice = (price) => `${price} ₾`;

    const showToast = (message) => {
        const toast = document.querySelector(".cart-toast");
        toast.textContent = message;
        toast.classList.add("is-visible");
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => {
            toast.classList.remove("is-visible");
        }, 2400);
    };

    const saveCart = () => {
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(Array.from(cart.values())));
        } catch (error) {
            console.error("Could not save the Gemos Hub cart.", error);
            showToast("კალათა ამ სესიაში იმუშავებს, მაგრამ შენახვა ვერ მოხერხდა.");
        }
    };

    const loadCart = () => {
        try {
            const saved = window.localStorage.getItem(storageKey);
            if (!saved) return;

            const items = JSON.parse(saved);
            if (!Array.isArray(items)) throw new TypeError("Saved cart must be a list.");

            for (const item of items) {
                if (
                    typeof item.id !== "string" ||
                    typeof item.name !== "string" ||
                    !Number.isSafeInteger(item.price) ||
                    item.price < 0 ||
                    !Number.isSafeInteger(item.quantity) ||
                    item.quantity < 1
                ) {
                    throw new TypeError("Saved cart contains an invalid item.");
                }

                cart.set(item.id, item);
            }
        } catch (error) {
            console.error("Could not restore the Gemos Hub cart.", error);
            showToast("წინა კალათის ჩატვირთვა ვერ მოხერხდა.");
            cart.clear();
        }
    };

    const makeElement = (tagName, className, text) => {
        const element = document.createElement(tagName);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
    };

    const drawerRoot = makeElement("div", "cart-root");
    drawerRoot.innerHTML = `
        <button class="cart-backdrop" type="button" aria-label="კალათის დახურვა" hidden></button>
        <aside class="cart-drawer" id="shopping-cart" role="dialog" aria-modal="true" aria-labelledby="cart-title" aria-hidden="true" inert>
            <div class="cart-drawer-header">
                <div>
                    <p class="cart-kicker">Gemos Hub</p>
                    <h2 id="cart-title">შენი კალათა</h2>
                </div>
                <button class="cart-close" type="button" aria-label="კალათის დახურვა">×</button>
            </div>
            <p class="cart-message" aria-live="polite"></p>
            <div class="cart-items"></div>
            <p class="cart-empty">კალათა ჯერ ცარიელია. აირჩიე მენიუდან საყვარელი გემო.</p>
            <div class="cart-summary">
                <div class="cart-total-line"><span>ჯამი</span><strong class="cart-total">0 ₾</strong></div>
                <a class="cart-order" href="#" aria-disabled="true">WhatsApp-ში შეკვეთის გაგრძელება <span aria-hidden="true">↗</span></a>
                <p class="cart-order-note">გაიხსნება WhatsApp მზა შეკვეთით. გაგზავნისთვის დააჭირე Send-ს WhatsApp-ში.</p>
            </div>
        </aside>
        <div class="cart-toast" role="status" aria-live="polite"></div>
    `;
    document.body.append(drawerRoot);

    const toggleButton = makeElement("button", "cart-toggle");
    toggleButton.type = "button";
    toggleButton.setAttribute("aria-controls", "shopping-cart");
    toggleButton.setAttribute("aria-expanded", "false");
    toggleButton.innerHTML = '<span class="cart-toggle-icon" aria-hidden="true">🛒</span><span>კალათა</span><span class="cart-count" aria-label="0 პროდუქტი">0</span>';
    document.body.append(toggleButton);

    const panel = drawerRoot.querySelector(".cart-drawer");
    const backdrop = drawerRoot.querySelector(".cart-backdrop");
    const closeButton = drawerRoot.querySelector(".cart-close");
    const itemList = drawerRoot.querySelector(".cart-items");
    const emptyMessage = drawerRoot.querySelector(".cart-empty");
    const totalLabel = drawerRoot.querySelector(".cart-total");
    const orderLink = drawerRoot.querySelector(".cart-order");
    const itemCountLabel = toggleButton.querySelector(".cart-count");
    const orderMessage = drawerRoot.querySelector(".cart-message");

    const getCartItems = () => Array.from(cart.values());

    const renderCart = () => {
        const items = getCartItems();
        const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

        itemCountLabel.textContent = String(totalCount);
        itemCountLabel.setAttribute("aria-label", `${totalCount} პროდუქტი`);
        totalLabel.textContent = formatPrice(totalPrice);
        emptyMessage.hidden = items.length > 0;
        orderLink.setAttribute("aria-disabled", String(items.length === 0));
        orderLink.href = items.length
            ? `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodeURIComponent(
                `გამარჯობა, Gemos Hub! მინდა შეკვეთა:\n${items
                    .map((item) => `- ${item.name} x${item.quantity} — ${formatPrice(item.price * item.quantity)}`)
                    .join("\n")}\nჯამი: ${formatPrice(totalPrice)}`
            )}`
            : "#";
        orderLink.tabIndex = items.length ? 0 : -1;

        itemList.replaceChildren();
        for (const item of items) {
            const row = makeElement("article", "cart-item");
            const detail = makeElement("div", "cart-item-details");
            detail.append(
                makeElement("h3", "cart-item-name", item.name),
                makeElement("p", "cart-item-price", `${formatPrice(item.price)} / ცალი`)
            );

            const controls = makeElement("div", "cart-item-controls");
            const decreaseButton = makeElement("button", "cart-quantity-button", "−");
            decreaseButton.type = "button";
            decreaseButton.setAttribute("aria-label", `${item.name}: რაოდენობის შემცირება`);
            decreaseButton.addEventListener("click", () => changeQuantity(item.id, -1));

            const quantity = makeElement("span", "cart-item-quantity", String(item.quantity));
            quantity.setAttribute("aria-label", "რაოდენობა");

            const increaseButton = makeElement("button", "cart-quantity-button", "+");
            increaseButton.type = "button";
            increaseButton.setAttribute("aria-label", `${item.name}: რაოდენობის გაზრდა`);
            increaseButton.addEventListener("click", () => changeQuantity(item.id, 1));

            const removeButton = makeElement("button", "cart-remove", "წაშლა");
            removeButton.type = "button";
            removeButton.addEventListener("click", () => removeItem(item.id));

            controls.append(decreaseButton, quantity, increaseButton, removeButton);
            row.append(detail, controls);
            itemList.append(row);
        }
    };

    const addItem = (name, price) => {
        const id = `${name}|${price}`;
        const item = cart.get(id);
        if (item) item.quantity += 1;
        else cart.set(id, { id, name, price, quantity: 1 });
        saveCart();
        renderCart();
        showToast(`${name} დაემატა კალათაში`);
    };

    function changeQuantity(id, amount) {
        const item = cart.get(id);
        if (!item) return;
        item.quantity += amount;
        if (item.quantity < 1) cart.delete(id);
        saveCart();
        renderCart();
    }

    function removeItem(id) {
        cart.delete(id);
        saveCart();
        renderCart();
    }

    const openCart = () => {
        panel.inert = false;
        panel.setAttribute("aria-hidden", "false");
        backdrop.hidden = false;
        requestAnimationFrame(() => {
            panel.classList.add("is-open");
            backdrop.classList.add("is-visible");
        });
        toggleButton.setAttribute("aria-expanded", "true");
        document.body.classList.add("cart-open");
        closeButton.focus();
    };

    const closeCart = () => {
        panel.classList.remove("is-open");
        backdrop.classList.remove("is-visible");
        panel.setAttribute("aria-hidden", "true");
        panel.inert = true;
        backdrop.hidden = true;
        toggleButton.setAttribute("aria-expanded", "false");
        document.body.classList.remove("cart-open");
        toggleButton.focus();
    };

    document.querySelectorAll(".product-row").forEach((row) => {
        const name = row.querySelector("h3")?.textContent.trim();
        const priceText = row.querySelector(".product-price")?.textContent ?? "";
        const price = Number(priceText.replace(/[^\d]/g, ""));
        if (!name || !Number.isSafeInteger(price) || price < 0) return;

        const addButton = makeElement("button", "add-to-cart");
        addButton.type = "button";
        addButton.setAttribute("aria-label", `${name} — კალათაში დამატება`);
        addButton.innerHTML = '<span aria-hidden="true">+</span><span class="add-to-cart-label">დამატება</span>';
        addButton.addEventListener("click", () => addItem(name, price));
        row.append(addButton);
    });

    toggleButton.addEventListener("click", openCart);
    closeButton.addEventListener("click", closeCart);
    backdrop.addEventListener("click", closeCart);
    orderLink.addEventListener("click", (event) => {
        if (cart.size === 0) {
            event.preventDefault();
            orderMessage.textContent = "შეკვეთისთვის ჯერ დაამატე პროდუქტი კალათაში.";
            return;
        }
        orderMessage.textContent = "შეკვეთა გამზადებულია WhatsApp-ში — გაგზავნისთვის დააჭირე Send-ს.";
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !panel.inert) closeCart();
        if (event.key !== "Tab" || panel.inert) return;

        const focusable = Array.from(
            panel.querySelectorAll('a[href]:not([tabindex="-1"]), button:not([disabled])')
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });

    loadCart();
    renderCart();
})();
