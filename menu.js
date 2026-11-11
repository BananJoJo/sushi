(() => {
  const dessertNames = new Set(["Десерты", "Варенье", "Мороженое"]);
  const [pizza, ...cafe] = window.menuDrinks ?? [];
  const groups = [
    { id: "rolls", title: "Роллы, суши и сеты", entries: [...(window.menuRollsCold ?? []), ...(window.menuRollsHot ?? [])] },
    { id: "pizza", title: "Пицца", entries: pizza ? [pizza] : [] },
    { id: "kitchen", title: "Кухня", entries: window.menuKitchen ?? [] },
    { id: "drinks", title: "Напитки", entries: cafe.filter(({ title }) => !dessertNames.has(title)) },
    { id: "desserts", title: "Десерты", entries: cafe.filter(({ title }) => dessertNames.has(title)) },
  ];
  const sections = document.getElementById("sections");
  const links = document.getElementById("menu-links");
  const cart = document.getElementById("cart");
  const rows = document.getElementById("cart-items");
  const triggers = [...document.querySelectorAll(".cart-trigger")];
  const order = document.getElementById("cart-order");
  const selected = new Map();
  const cardQuantities = new Map();
  const backTop = document.getElementById("back-top");
  const menuQuick = document.getElementById("menu-quick");
  function updateShortcuts() {
    backTop.hidden = window.scrollY < 210;
    menuQuick.hidden = links.getBoundingClientRect().bottom > 0;
  }
  window.addEventListener("scroll", updateShortcuts, { passive: true });
  window.addEventListener("resize", updateShortcuts);
  const priceFormat = new Intl.NumberFormat("ru-RU");
  const money = amount => `${priceFormat.format(amount)} ₽`;
  const button = (text, label) => {
    const el = document.createElement("button");
    el.type = "button";
    el.textContent = text;
    el.setAttribute("aria-label", label);
    return el;
  };

  function renderCart() {
    let count = 0;
    let total = 0;
    const active = document.activeElement;
    const hadRowFocus = rows.contains(active);
    const focusKey = hadRowFocus ? active.dataset.focusKey : undefined;
    rows.replaceChildren();
    const lines = [];
    for (const [id, item] of selected) {
      const { name, price, qty } = item;
      count += qty;
      total += qty * price;
      lines.push(`${name} × ${qty} — ${money(qty * price)}`);
      const row = document.createElement("li");
      const title = document.createElement("span");
      title.textContent = `${name} · ${money(qty * price)}`;
      const controls = document.createElement("div");
      controls.className = "quantity";
      const minus = button("−", `Уменьшить количество: ${name}`);
      const plus = button("+", `Увеличить количество: ${name}`);
      minus.dataset.focusKey = `${id}-minus`;
      plus.dataset.focusKey = `${id}-plus`;
      minus.addEventListener("click", () => change(id, item, -1));
      plus.addEventListener("click", () => change(id, item, 1));
      controls.append(minus, String(qty), plus);
      row.append(title, controls);
      rows.append(row);
    }
    document.getElementById("cart-count").textContent = count;
    document.getElementById("cart-quick-total").textContent = money(total);
    document.getElementById("cart-total").textContent = money(total);
    document.getElementById("cart-empty").hidden = count > 0;
    document.getElementById("cart-checkout").hidden = count === 0;
    triggers[1].hidden = count === 0;
    if (count) {
      const method = cart.querySelector('input:checked').value;
      const message = ["Здравствуйте! Хочу заказать в СушиТайм.", method, "", ...lines, "", `Сумма блюд: ${money(total)}`].join("\n");
      order.href = `https://wa.me/79280210905?text=${encodeURIComponent(message)}`;
    } else order.removeAttribute("href");
    if (hadRowFocus) (rows.querySelector(`[data-focus-key="${focusKey}"]`) ?? rows.querySelector("button") ?? cart.querySelector("button")).focus();
  }

  function change(id, item, delta) {
    const qty = (selected.get(id)?.qty ?? 0) + delta;
    if (qty > 0) selected.set(id, { ...item, qty });
    else selected.delete(id);
    const controls = cardQuantities.get(id);
    if (controls) {
      const { stepper, quantity, minus, add } = controls;
      if (qty === 0 && document.activeElement === minus) add.focus();
      quantity.textContent = qty;
      stepper.classList.toggle("is-active", qty > 0);
      minus.hidden = quantity.hidden = qty === 0;
    }
    renderCart();
    document.getElementById("cart-status").textContent = `${item.name}: ${qty} в корзине`;
  }

  triggers.forEach(trigger => trigger.addEventListener("click", () => cart.showModal()));
  cart.addEventListener("close", () => {
    if (document.activeElement === document.body) (triggers[1].hidden ? triggers[0] : triggers[1]).focus();
  });
  cart.addEventListener("change", renderCart);
  triggers[0].hidden = false;

  function dishTone(name) {
    if (/лосос|семг|сёмг|кревет|икр/i.test(name)) return "coral";
    if (/угор|угр|унаги|баклажан/i.test(name)) return "plum";
    if (/огур|авокад|зел[её]н|матча/i.test(name)) return "herb";
    if (/сыр|манго|мед|мёд/i.test(name)) return "gold";
    const tones = ["herb", "coral", "gold", "plum"];
    return tones[[...name].reduce((sum, letter) => sum + letter.codePointAt(0), 0) % tones.length];
  }

  function renderCategory({ title, items }, categoryId, showHeading) {
    const panel = document.createElement("section");
    panel.className = "panel";
    if (showHeading) {
      const heading = document.createElement("h4");
      heading.textContent = title;
      panel.append(heading);
    }
    const grid = document.createElement("div");
    grid.className = "cards";
    items.forEach(([name, price, description], itemIndex) => {
      const dish = document.createElement("article");
      dish.className = "dish";
      dish.dataset.tone = dishTone(name);
      const dishName = document.createElement(showHeading ? "h5" : "h4");
      dishName.className = "dish-name";
      dishName.textContent = name;
      dish.append(dishName);
      if (description) {
        const details = document.createElement("p");
        details.className = "description";
        details.textContent = description;
        dish.append(details);
      }
      const cost = document.createElement("p");
      cost.className = "price";
      const available = Number.isFinite(price);
      cost.textContent = available ? money(price) : "Цена уточняется";
      const footer = document.createElement("div");
      footer.className = "dish-footer";
      footer.append(cost);
      if (available) {
        const id = `${categoryId}-${itemIndex}`;
        const add = button("+", `Добавить в корзину: ${name}`);
        add.className = "dish-add";
        const minus = button("−", `Убрать из корзины: ${name}`);
        const quantity = document.createElement("span");
        quantity.className = "dish-quantity";
        const stepper = document.createElement("div");
        stepper.className = "dish-stepper";
        minus.hidden = quantity.hidden = true;
        cardQuantities.set(id, { stepper, quantity, minus, add });
        const item = { name, price };
        add.addEventListener("click", () => change(id, item, 1));
        minus.addEventListener("click", () => change(id, item, -1));
        stepper.append(minus, quantity, add);
        footer.append(stepper);
      }
      dish.append(footer);
      grid.append(dish);
    });
    panel.append(grid);
    return panel;
  }

  groups.forEach(({ id, title, entries }) => {
    if (!entries.length) return;
    const group = document.createElement("section");
    group.className = "menu-group";
    group.id = id;
    group.tabIndex = -1;
    const heading = document.createElement("h3");
    heading.textContent = title;
    group.append(heading);
    const jump = document.createElement("a");
    jump.href = `#${id}`;
    jump.textContent = title;
    links.append(jump);
    entries.forEach((entry, index) => group.append(renderCategory(entry, `${id}-${index}`, entries.length > 1)));
    sections.append(group);
  });

  const initialGroup = groups.find(({ id }) => location.hash === `#${id}`);
  if (initialGroup) document.getElementById(initialGroup.id)?.scrollIntoView({ behavior: "instant" });
  updateShortcuts();
  if ("IntersectionObserver" in window && window.matchMedia("(prefers-reduced-motion: no-preference)").matches) {
    const observer = new IntersectionObserver(items => {
      for (const item of items) {
        if (!item.isIntersecting) continue;
        if (item.target.getBoundingClientRect().bottom > 0) item.target.classList.add("enter-view");
        observer.unobserve(item.target);
      }
    }, { threshold: 0.12 });
    document.querySelectorAll(".menu-links, .dish").forEach(el => observer.observe(el));
  }
})();
