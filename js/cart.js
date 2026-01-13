// cart.js - ФИНАЛЬНАЯ ВЕРСИЯ С ПОДДЕРЖКОЙ SUBSCRIBE

document.addEventListener('DOMContentLoaded', function() {
    console.log('🛒 Инициализация страницы корзины');
    
    const cartItemsContainer = document.getElementById('cartItems');
    const orderForm = document.getElementById('orderForm');
    const clearCartBtn = document.getElementById('clearCart');
    const goodsTotalEl = document.getElementById('goodsTotal');
    const deliveryCostEl = document.getElementById('deliveryCost');
    const totalCostEl = document.getElementById('totalCost');
    
    const DELIVERY_COST = 0; // Бесплатная доставка

    // Устанавливаем минимальную дату (завтра)
    const deliveryDateInput = document.getElementById('deliveryDate');
    if (deliveryDateInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const minDate = tomorrow.toISOString().split('T')[0];
        deliveryDateInput.setAttribute('min', minDate);
        deliveryDateInput.value = minDate;
    }

    // --- Загрузка корзины ---
    async function loadCart() {
        const cartItems = utils.Cart.getItems();
        console.log('📦 Товары в корзине:', cartItems);

        if (!cartItemsContainer) {
            console.error('❌ Элемент #cartItems не найден!');
            return;
        }

        if (cartItems.length === 0) {
            cartItemsContainer.innerHTML = '<p class="empty-cart">Корзина пуста. Перейдите в <a href="index.html">каталог</a>, чтобы добавить товары.</p>';
            updateTotals(0);
            return;
        }

        try {
            const goodsPromises = cartItems.map(item => utils.apiRequest(`/goods/${item.id}`));
            const goods = await Promise.all(goodsPromises);
            
            renderCart(goods, cartItems);
            calculateTotals(goods);
        } catch (error) {
            console.error('❌ Ошибка загрузки товаров:', error);
            cartItemsContainer.innerHTML = '<p style="color: red;">Ошибка загрузки товаров</p>';
            utils.showNotification('Ошибка загрузки товаров из корзины', 'error');
        }
    }

    // --- Отображение корзины ---
    function renderCart(goods, cartItems) {
        cartItemsContainer.innerHTML = '';
        
        goods.forEach(good => {
            const cartItem = cartItems.find(item => item.id === good.id);
            const quantity = cartItem ? cartItem.quantity : 1;
            
            const price = good.discount_price || good.actual_price || 0;
            const imageUrl = good.image_url || 'https://via.placeholder.com/120x120?text=No+Image';
            
            const itemDiv = document.createElement('div');
            itemDiv.className = 'cart-item';
            itemDiv.innerHTML = `
                <img src="${imageUrl}" alt="${good.name}" class="cart-item-image"
                     onerror="this.src='https://via.placeholder.com/120x120?text=No+Image'">
                <div class="cart-item-details">
                    <h3 class="cart-item-name">${good.name}</h3>
                    <p class="cart-item-price">${price} ₽</p>
                </div>
                <div class="cart-item-actions">
                    <div class="quantity-controls">
                        <button class="qty-btn minus" data-id="${good.id}">−</button>
                        <span class="quantity">${quantity}</span>
                        <button class="qty-btn plus" data-id="${good.id}">+</button>
                    </div>
                    <button class="remove-btn" data-id="${good.id}" title="Удалить">🗑️</button>
                </div>
                <div class="cart-item-total">
                    <strong>${price * quantity} ₽</strong>
                </div>
            `;
            
            cartItemsContainer.appendChild(itemDiv);
        });

        // Обработчики кнопок
        document.querySelectorAll('.qty-btn.plus').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = parseInt(this.dataset.id);
                utils.Cart.addItem(id);
                loadCart();
            });
        });

        document.querySelectorAll('.qty-btn.minus').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = parseInt(this.dataset.id);
                utils.Cart.removeItem(id);
                loadCart();
            });
        });

        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = parseInt(this.dataset.id);
                utils.Cart.removeItem(id, true);
                loadCart();
                utils.showNotification('Товар удалён из корзины', 'info');
            });
        });
    }

    // --- Расчёт итоговой стоимости ---
    function calculateTotals(goods) {
        const cartItems = utils.Cart.getItems();
        let goodsTotal = 0;

        goods.forEach(good => {
            const cartItem = cartItems.find(item => item.id === good.id);
            const quantity = cartItem ? cartItem.quantity : 1;
            const price = good.discount_price || good.actual_price || 0;
            goodsTotal += price * quantity;
        });

        updateTotals(goodsTotal);
    }

    function updateTotals(goodsTotal) {
        if (goodsTotalEl) goodsTotalEl.textContent = `${goodsTotal} ₽`;
        if (deliveryCostEl) deliveryCostEl.textContent = `${DELIVERY_COST} ₽`;
        if (totalCostEl) totalCostEl.textContent = `${goodsTotal + DELIVERY_COST} ₽`;
    }

    // --- Оформление заказа ---
    if (orderForm) {
        orderForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const cartItems = utils.Cart.getItems();
            if (cartItems.length === 0) {
                utils.showNotification('Корзина пуста!', 'error');
                return;
            }

            // Получаем данные формы
            const customerName = document.getElementById('customerName').value.trim();
            const customerEmail = document.getElementById('customerEmail').value.trim();
            const customerPhone = document.getElementById('customerPhone').value.trim();
            const deliveryAddress = document.getElementById('deliveryAddress').value.trim();
            const deliveryDate = document.getElementById('deliveryDate').value;
            const deliveryTime = document.getElementById('deliveryTime').value;
            const orderComment = document.getElementById('orderComment').value.trim();
            const subscribe = document.getElementById('subscribeNewsletter').checked; // ← НОВОЕ ПОЛЕ

            // Валидация
            if (!customerName || !customerEmail || !customerPhone || !deliveryAddress || !deliveryDate) {
                utils.showNotification('Заполните все обязательные поля!', 'error');
                return;
            }

            // Преобразуем дату в формат dd.mm.yyyy
            const [year, month, day] = deliveryDate.split('-');
            const formattedDate = `${day}.${month}.${year}`;

            // Формируем данные заказа
            const orderData = {
                full_name: customerName,
                email: customerEmail,
                phone: customerPhone,
                delivery_address: deliveryAddress,
                delivery_date: formattedDate,
                delivery_interval: deliveryTime,
                comment: orderComment,
                subscribe: subscribe ? 1 : 0, // ← ПРЕОБРАЗУЕМ В 0 ИЛИ 1
                good_ids: cartItems.map(item => item.id)
            };

            console.log('📤 Отправка заказа:', orderData);

            try {
                const result = await utils.apiRequest('/orders', 'POST', orderData);
                console.log('✅ Заказ создан:', result);
                
                utils.showNotification('Заказ успешно оформлен!', 'success');
                
                // Очищаем корзину
                utils.Cart.clear();
                
                // Перенаправляем на страницу заказов через 2 секунды
                setTimeout(() => {
                    window.location.href = 'orders.html';
                }, 2000);
                
            } catch (error) {
                console.error('❌ Ошибка оформления заказа:', error);
                utils.showNotification('Ошибка оформления заказа: ' + error.message, 'error');
            }
        });
    }

    // --- Очистка корзины ---
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', function() {
            if (confirm('Вы уверены, что хотите очистить корзину?')) {
                utils.Cart.clear();
                loadCart();
                utils.showNotification('Корзина очищена', 'info');
            }
        });
    }

    // Инициализация
    loadCart();
});
