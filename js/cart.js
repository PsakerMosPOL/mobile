// cart.js - ИСПРАВЛЕННАЯ ВЕРСИЯ

document.addEventListener('DOMContentLoaded', function() {
    const cartItemsContainer = document.getElementById('cartItems');
    const emptyCartMessage = document.getElementById('emptyCart');
    const orderForm = document.getElementById('orderForm');
    const totalCostSpan = document.getElementById('totalCost');
    const deliveryFeeSpan = document.getElementById('deliveryFee');
    const itemsCostSpan = document.getElementById('itemsCost');
    const clearCartBtn = document.getElementById('clearCart');

    let cartGoods = [];

    // --- Загрузка товаров корзины ---
    async function loadCartItems() {
        const cartItems = utils.Cart.getItems(); // ИСПРАВЛЕНО: возвращает [{id, quantity}, ...]
        
        if (cartItems.length === 0) {
            cartItemsContainer.style.display = 'none';
            emptyCartMessage.style.display = 'block';
            orderForm.style.display = 'none';
            updateTotalCost();
            return;
        }

        cartItemsContainer.style.display = 'block';
        emptyCartMessage.style.display = 'none';
        orderForm.style.display = 'block';

        try {
            console.log('📦 Загрузка товаров корзины:', cartItems);
            
            // Загрузка данных каждого товара по ID
            const promises = cartItems.map(item => utils.apiRequest(`/goods/${item.id}`));
            const goods = await Promise.all(promises);
            
            // Добавляем quantity к каждому товару
            cartGoods = goods.map((good, index) => ({
                ...good,
                quantity: cartItems[index].quantity
            }));

            console.log('✅ Товары корзины загружены:', cartGoods);
            renderCartItems(cartGoods);
            updateTotalCost();
        } catch (error) {
            console.error('❌ Ошибка загрузки товаров корзины:', error);
            utils.showNotification('Ошибка загрузки корзины', 'error');
        }
    }

    // --- Отображение товаров корзины ---
    function renderCartItems(goods) {
        cartItemsContainer.innerHTML = '';
        
        goods.forEach(good => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'cart-item';
            itemDiv.style.cssText = 'display: grid; grid-template-columns: 100px 1fr auto auto; gap: 1rem; align-items: center; padding: 1rem; border-bottom: 1px solid #eee;';
            
            const price = good.discount_price || good.actual_price;
            const totalPrice = price * good.quantity;
            
            itemDiv.innerHTML = `
                <img src="${good.image_url}" alt="${good.name}" 
                     style="width: 100px; height: 100px; object-fit: cover; border-radius: 4px;"
                     onerror="this.src='https://via.placeholder.com/100?text=No+Image'">
                
                <div>
                    <div style="font-weight: 600; margin-bottom: 0.5rem;">${good.name}</div>
                    <div style="color: #666;">
                        ${good.discount_price ? 
                            `<span style="color: #28a745; font-weight: 700;">${good.discount_price} ₽</span> 
                             <span style="text-decoration: line-through; color: #999;">${good.actual_price} ₽</span>` :
                            `<span style="font-weight: 700;">${good.actual_price} ₽</span>`
                        }
                    </div>
                </div>
                
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <button class="quantity-btn" data-id="${good.id}" data-action="decrease" 
                            style="padding: 0.25rem 0.75rem; background: #f0f0f0; border: none; border-radius: 4px; cursor: pointer;">−</button>
                    <input type="number" value="${good.quantity}" min="1" 
                           data-id="${good.id}" class="quantity-input"
                           style="width: 60px; text-align: center; padding: 0.25rem; border: 1px solid #ccc; border-radius: 4px;">
                    <button class="quantity-btn" data-id="${good.id}" data-action="increase"
                            style="padding: 0.25rem 0.75rem; background: #f0f0f0; border: none; border-radius: 4px; cursor: pointer;">+</button>
                </div>
                
                <div style="text-align: right;">
                    <div style="font-weight: 700; font-size: 1.1rem; margin-bottom: 0.5rem;">${totalPrice} ₽</div>
                    <button class="remove-from-cart" data-id="${good.id}"
                            style="padding: 0.5rem 1rem; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Удалить</button>
                </div>
            `;
            cartItemsContainer.appendChild(itemDiv);
        });

        // Обработчики удаления
        document.querySelectorAll('.remove-from-cart').forEach(button => {
            button.addEventListener('click', (e) => {
                const goodId = parseInt(e.target.dataset.id, 10);
                utils.Cart.removeItem(goodId);
                loadCartItems();
            });
        });

        // Обработчики изменения количества (кнопки)
        document.querySelectorAll('.quantity-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const goodId = parseInt(e.target.dataset.id, 10);
                const action = e.target.dataset.action;
                const item = cartGoods.find(g => g.id === goodId);
                
                if (action === 'increase') {
                    utils.Cart.updateQuantity(goodId, item.quantity + 1);
                } else if (action === 'decrease' && item.quantity > 1) {
                    utils.Cart.updateQuantity(goodId, item.quantity - 1);
                }
                
                loadCartItems();
            });
        });

        // Обработчики изменения количества (input)
        document.querySelectorAll('.quantity-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const goodId = parseInt(e.target.dataset.id, 10);
                const quantity = parseInt(e.target.value, 10);
                
                if (quantity > 0) {
                    utils.Cart.updateQuantity(goodId, quantity);
                    loadCartItems();
                } else {
                    utils.showNotification('Количество должно быть больше 0', 'error');
                    loadCartItems();
                }
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
            const price = good.discount_price || good.actual_price;
            itemsCost += price * good.quantity;
        });

        if (itemsCostSpan) {
            itemsCostSpan.textContent = `${itemsCost} ₽`;
        }

        const total = itemsCost + deliveryFee;
        if (totalCostSpan) {
            totalCostSpan.textContent = `${total} ₽`;
        }
    }

    // --- Отправка заказа ---
    orderForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const cartItems = utils.Cart.getItems();
        if (cartItems.length === 0) {
            utils.showNotification('Корзина пуста!', 'error');
            return;
        }

        // ВАЖНО: Формат даты dd.mm.yyyy для API
        const deliveryDateInput = document.getElementById('deliveryDate').value; // YYYY-MM-DD
        const [year, month, day] = deliveryDateInput.split('-');
        const deliveryDateFormatted = `${day}.${month}.${year}`; // dd.mm.yyyy

        const orderData = {
            full_name: document.getElementById('fullName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            subscribe: document.getElementById('subscribe')?.checked ? 1 : 0,
            delivery_address: document.getElementById('deliveryAddress').value,
            delivery_date: deliveryDateFormatted, // ИСПРАВЛЕНО: dd.mm.yyyy
            delivery_interval: document.getElementById('deliveryInterval').value,
            comment: document.getElementById('comment')?.value || '',
            good_ids: cartItems.map(item => item.id) // ИСПРАВЛЕНО: только ID
        };

        console.log('📤 Отправка заказа:', orderData);

        try {
            const response = await utils.apiRequest('/orders', 'POST', orderData);
            console.log('✅ Заказ создан:', response);
            
            utils.showNotification('Заказ успешно оформлен!', 'success');
            utils.Cart.clear();
            
            // Перенаправление через 1.5 секунды
            setTimeout(() => {
                window.location.href = 'orders.html';
            }, 1500);
            
        } catch (error) {
            console.error('❌ Ошибка оформления заказа:', error);
            utils.showNotification(`Ошибка: ${error.message}`, 'error');
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
    console.log('🚀 Инициализация корзины');
    loadCartItems();
});
