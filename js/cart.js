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
            const priceDisplay = good.discount_price 
                ? `<span class="discount">${good.discount_price} ₽</span><span class="price original">${good.actual_price} ₽</span>` 
                : `<span class="price">${good.actual_price} ₽</span>`;
            
            itemDiv.innerHTML = `
                <img src="${good.image_url}" alt="${good.name}" onerror="this.src='assets/placeholder.png';">
                <div class="name" title="${good.name}">${good.name}</div>
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
        const deliveryDate = document.getElementById('deliveryDate')?.value || '';
        const deliveryInterval = document.getElementById('deliveryInterval')?.value || '';
        const deliveryFee = utils.calculateDeliveryFee(deliveryDate, deliveryInterval);
        
        if (deliveryFeeSpan) {
            deliveryFeeSpan.textContent = `${deliveryFee} ₽`;
        }

        let itemsCost = 0;
        cartGoods.forEach(good => {
            itemsCost += (good.discount_price || good.actual_price);
        });

        const total = itemsCost + deliveryFee;
        if (totalCostSpan) {
            totalCostSpan.textContent = `${total} ₽`;
        }
    }

    // --- Отправка заказа ---
    orderForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const ids = utils.Cart.getIds();
        if (ids.length === 0) {
            utils.showNotification('Корзина пуста!', 'error');
            return;
        }

        // ВАЖНО: Создаём FormData из формы
        const formData = new FormData(orderForm);

        const orderData = {
            full_name: formData.get('full_name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            subscribe: formData.get('subscribe') ? 1 : 0,
            delivery_address: formData.get('delivery_address'),
            delivery_date: formData.get('delivery_date'), // Формат YYYY-MM-DD
            delivery_interval: formData.get('delivery_interval'),
            comment: formData.get('comment') || '',
            good_ids: ids.map(id => parseInt(id))
        };

        try {
            await utils.apiRequest('/orders', 'POST', orderData);
            utils.showNotification('Заказ успешно оформлен!', 'success');
            utils.Cart.clear();
            
            // Перенаправление через 1.5 секунды
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
            
        } catch (error) {
            console.error('Ошибка оформления заказа:', error);
            // Уведомление об ошибке показано в utils.apiRequest
        }
    });

    // --- Обновление стоимости при изменении даты/времени ---
    const deliveryDateInput = document.getElementById('deliveryDate');
    const deliveryIntervalInput = document.getElementById('deliveryInterval');
    
    if (deliveryDateInput) {
        deliveryDateInput.addEventListener('change', updateTotalCost);
    }
    if (deliveryIntervalInput) {
        deliveryIntervalInput.addEventListener('change', updateTotalCost);
    }

    // --- Очистка корзины ---
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', function() {
            if (confirm('Вы уверены, что хотите очистить корзину?')) {
                utils.Cart.clear();
                loadCartItems();
            }
        });
    }

    // --- Инициализация ---
    loadCartItems();
});
