// cart.js

document.addEventListener('DOMContentLoaded', function() {
    const cartItemsContainer = document.getElementById('cartItems');
    const emptyCartMessage = document.getElementById('emptyCart');
    const orderForm = document.getElementById('orderForm');
    const totalCostSpan = document.getElementById('totalCost');
    const deliveryFeeSpan = document.getElementById('deliveryFee');
    const clearCartBtn = document.getElementById('clearCart');
    const placeOrderBtn = document.getElementById('placeOrder');

    let cartGoods = [];

    // --- Загрузка товаров корзины ---
    async function loadCartItems() {
        const ids = utils.Cart.getIds();
        if (ids.length === 0) {
            cartItemsContainer.style.display = 'none';
            emptyCartMessage.style.display = 'block';
            updateTotalCost();
            return;
        }

        cartItemsContainer.style.display = 'grid';
        emptyCartMessage.style.display = 'none';

        try {
            // Загрузка данных каждого товара по ID
            const promises = ids.map(id => utils.apiRequest(`/goods/${id}`));
            cartGoods = await Promise.all(promises);

            renderCartItems(cartGoods);
            updateTotalCost();
        } catch (error) {
            console.error('Ошибка загрузки товаров корзины:', error);
        }
    }

    // --- Отображение товаров корзины ---
    function renderCartItems(goods) {
        cartItemsContainer.innerHTML = '';
        goods.forEach(good => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'good-card';
            const priceDisplay = good.discount_price ? `<span class="discount">${good.discount_price} ₽</span><span class="price original">${good.actual_price} ₽</span>` : `<span class="price">${good.actual_price} ₽</span>`;
            itemDiv.innerHTML = `
                <img src="${good.image_url.trim()}" alt="${good.name}" onerror="this.src='assets/placeholder.png';">
                <div class="name">${good.name}</div>
                <div class="rating">⭐ ${good.rating}</div>
                ${priceDisplay}
                <button class="remove-from-cart" data-id="${good.id}">Удалить</button>
            `;
            cartItemsContainer.appendChild(itemDiv);
        });

        // Обработчики удаления
        document.querySelectorAll('.remove-from-cart').forEach(button => {
            button.addEventListener('click', (e) => {
                const goodId = parseInt(e.target.dataset.id, 10);
                utils.Cart.removeItem(goodId);
                loadCartItems(); // Перезагрузить список после удаления
            });
        });
    }

    // --- Расчёт стоимости ---
    function updateTotalCost() {
        const deliveryDate = document.getElementById('deliveryDate').value;
        const deliveryInterval = document.getElementById('deliveryInterval').value;
        const deliveryFee = utils.calculateDeliveryFee(deliveryDate, deliveryInterval);
        deliveryFeeSpan.textContent = `${deliveryFee} ₽`;

        let itemsCost = 0;
        cartGoods.forEach(good => {
            itemsCost += (good.discount_price || good.actual_price);
        });

        const total = itemsCost + deliveryFee;
        totalCostSpan.textContent = `${total} ₽`;
    }

    // --- Отправка заказа ---
    orderForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const ids = utils.Cart.getIds();
        if (ids.length === 0) {
            utils.showNotification('Корзина пуста!', 'error');
            return;
        }

        const orderData = {
            full_name: document.getElementById('fullName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            subscribe: document.getElementById('subscribe').checked,
            delivery_address: document.getElementById('deliveryAddress').value,
            delivery_date: document.getElementById('deliveryDate').value, // Формат: YYYY-MM-DD
            delivery_interval: document.getElementById('deliveryInterval').value,
            comment: document.getElementById('comment').value,
            good_ids: ids
        };

        try {
            await utils.apiRequest('/orders', 'POST', orderData);
            utils.showNotification('Заказ успешно оформлен!', 'success');
            utils.Cart.clear();
            window.location.href = 'index.html'; // Перенаправить на главную
        } catch (error) {
            console.error('Ошибка оформления заказа:', error);
        }
    });

    // --- Обновление стоимости при изменении даты/времени ---
    document.getElementById('deliveryDate').addEventListener('change', updateTotalCost);
    document.getElementById('deliveryInterval').addEventListener('change', updateTotalCost);

    // --- Очистка корзины ---
    clearCartBtn.addEventListener('click', function() {
        if (confirm('Вы уверены, что хотите очистить корзину?')) {
            utils.Cart.clear();
            loadCartItems();
        }
    });

    // --- Инициализация ---
    loadCartItems();
});