// cart.js - ФИНАЛЬНАЯ ВЕРСИЯ БЕЗ ОШИБОК

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Инициализация корзины');
    
    const cartItemsContainer = document.getElementById('cartItems');
    const orderForm = document.getElementById('orderForm');
    const totalCostSpan = document.getElementById('totalCost');
    const deliveryCostSpan = document.getElementById('deliveryCost');
    const goodsTotalSpan = document.getElementById('goodsTotal');
    const clearCartBtn = document.getElementById('clearCart');

    let cartGoods = [];

    // --- Загрузка товаров корзины ---
    async function loadCartItems() {
        const cartItems = utils.Cart.getItems();
        
        console.log('📦 Корзина:', cartItems);
        
        // Проверяем существование контейнера
        if (!cartItemsContainer) {
            console.error('❌ Элемент #cartItems не найден!');
            return;
        }
        
        if (cartItems.length === 0) {
            cartItemsContainer.innerHTML = '<p class="empty-cart" style="padding: 2rem; text-align: center; color: #999;">Корзина пуста. Перейдите в <a href="index.html" style="color: #cb11ab; text-decoration: underline;">каталог</a>, чтобы добавить товары.</p>';
            updateTotalCost();
            return;
        }

        try {
            console.log('📡 Загрузка товаров корзины...');
            
            const promises = cartItems.map(item => utils.apiRequest(`/goods/${item.id}`));
            const goods = await Promise.all(promises);
            
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
            cartItemsContainer.innerHTML = '<p style="color: red; padding: 2rem; text-align: center;">Ошибка загрузки товаров. Попробуйте обновить страницу.</p>';
        }
    }

    // --- Отображение товаров корзины ---
    function renderCartItems(goods) {
        if (!cartItemsContainer) return;
        
        cartItemsContainer.innerHTML = '';
        
        goods.forEach(good => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'cart-item';
            itemDiv.style.cssText = `
                display: grid; 
                grid-template-columns: 120px 1fr auto auto; 
                gap: 1.5rem; 
                align-items: center; 
                padding: 1.5rem; 
                border-bottom: 1px solid #eee; 
                background: white; 
                margin-bottom: 0.5rem; 
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            `;
            
            const price = good.discount_price || good.actual_price;
            const totalPrice = price * good.quantity;
            
            itemDiv.innerHTML = `
                <img src="${good.image_url}" 
                     alt="${good.name}" 
                     style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px; border: 1px solid #f0f0f0;"
                     onerror="this.src='https://via.placeholder.com/120?text=No+Image'">
                
                <div>
                    <div style="font-weight: 600; font-size: 1rem; margin-bottom: 0.5rem; line-height: 1.3;">${good.name}</div>
                    <div style="color: #666; font-size: 0.9rem; margin-top: 0.5rem;">
                        ${good.discount_price ? 
                            `<span style="color: #28a745; font-weight: 700; font-size: 1.1rem;">${good.discount_price} ₽</span> 
                             <span style="text-decoration: line-through; color: #999; margin-left: 0.5rem;">${good.actual_price} ₽</span>` :
                            `<span style="font-weight: 700; font-size: 1.1rem;">${good.actual_price} ₽</span>`
                        }
                    </div>
                </div>
                
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <button class="quantity-btn" data-id="${good.id}" data-action="decrease" 
                            style="width: 32px; height: 32px; background: #f0f0f0; border: none; border-radius: 6px; cursor: pointer; font-size: 1.2rem; font-weight: 700; color: #666;">−</button>
                    <input type="number" value="${good.quantity}" min="1" max="99"
                           data-id="${good.id}" class="quantity-input"
                           style="width: 60px; text-align: center; padding: 0.5rem; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem; font-weight: 600;">
                    <button class="quantity-btn" data-id="${good.id}" data-action="increase"
                            style="width: 32px; height: 32px; background: #f0f0f0; border: none; border-radius: 6px; cursor: pointer; font-size: 1.2rem; font-weight: 700; color: #666;">+</button>
                </div>
                
                <div style="text-align: right; min-width: 140px;">
                    <div style="font-weight: 700; font-size: 1.3rem; margin-bottom: 1rem; color: #000;">${totalPrice} ₽</div>
                    <button class="remove-from-cart" data-id="${good.id}"
                            style="padding: 0.5rem 1rem; background: #e31d1c; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Удалить</button>
                </div>
            `;
            cartItemsContainer.appendChild(itemDiv);
        });

        // Обработчики кнопок удаления
        document.querySelectorAll('.remove-from-cart').forEach(button => {
            button.addEventListener('click', (e) => {
                const goodId = parseInt(e.target.dataset.id, 10);
                if (confirm('Удалить товар из корзины?')) {
                    utils.Cart.removeItem(goodId);
                    loadCartItems();
                }
            });
        });

        // Обработчики кнопок +/-
        document.querySelectorAll('.quantity-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const goodId = parseInt(e.target.dataset.id, 10);
                const action = e.target.dataset.action;
                const item = cartGoods.find(g => g.id === goodId);
                
                if (!item) return;
                
                if (action === 'increase') {
                    utils.Cart.updateQuantity(goodId, item.quantity + 1);
                } else if (action === 'decrease' && item.quantity > 1) {
                    utils.Cart.updateQuantity(goodId, item.quantity - 1);
                }
                
                loadCartItems();
            });
            
            button.addEventListener('mouseenter', (e) => {
                e.target.style.background = '#e0e0e0';
            });
            button.addEventListener('mouseleave', (e) => {
                e.target.style.background = '#f0f0f0';
            });
        });

        // Обработчики input количества
        document.querySelectorAll('.quantity-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const goodId = parseInt(e.target.dataset.id, 10);
                const quantity = parseInt(e.target.value, 10);
                
                if (quantity > 0 && quantity <= 99) {
                    utils.Cart.updateQuantity(goodId, quantity);
                    loadCartItems();
                } else {
                    utils.showNotification('Количество должно быть от 1 до 99', 'error');
                    loadCartItems();
                }
            });
        });
    }

    // --- Расчёт стоимости ---
    function updateTotalCost() {
        const deliveryDateInput = document.getElementById('deliveryDate');
        const deliveryTimeInput = document.getElementById('deliveryTime');
        
        const deliveryDate = deliveryDateInput ? deliveryDateInput.value : '';
        const deliveryInterval = deliveryTimeInput ? deliveryTimeInput.value : '';
        const deliveryFee = utils.calculateDeliveryFee(deliveryDate, deliveryInterval);
        
        if (deliveryCostSpan) {
            deliveryCostSpan.textContent = `${deliveryFee} ₽`;
        }

        let itemsCost = 0;
        cartGoods.forEach(good => {
            const price = good.discount_price || good.actual_price;
            itemsCost += price * good.quantity;
        });

        if (goodsTotalSpan) {
            goodsTotalSpan.textContent = `${itemsCost} ₽`;
        }

        const total = itemsCost + deliveryFee;
        if (totalCostSpan) {
            totalCostSpan.textContent = `${total} ₽`;
        }
    }

    // --- Отправка заказа ---
    if (orderForm) {
        orderForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const cartItems = utils.Cart.getItems();
            if (cartItems.length === 0) {
                utils.showNotification('Корзина пуста!', 'error');
                return;
            }

            const deliveryDateInput = document.getElementById('deliveryDate');
            if (!deliveryDateInput || !deliveryDateInput.value) {
                utils.showNotification('Укажите дату доставки', 'error');
                return;
            }
            
            const [year, month, day] = deliveryDateInput.value.split('-');
            const deliveryDateFormatted = `${day}.${month}.${year}`;

            const orderData = {
                full_name: document.getElementById('customerName')?.value || '',
                email: document.getElementById('customerEmail')?.value || '',
                phone: document.getElementById('customerPhone')?.value || '',
                subscribe: document.getElementById('subscribeNewsletter')?.checked ? 1 : 0,
                delivery_address: document.getElementById('deliveryAddress')?.value || '',
                delivery_date: deliveryDateFormatted,
                delivery_interval: document.getElementById('deliveryTime')?.value || '',
                comment: document.getElementById('orderComment')?.value || '',
                good_ids: cartItems.map(item => item.id)
            };

            console.log('📤 Отправка заказа:', orderData);

            try {
                const response = await utils.apiRequest('/orders', 'POST', orderData);
                console.log('✅ Заказ создан:', response);
                
                utils.showNotification('Заказ успешно оформлен!', 'success');
                utils.Cart.clear();
                
                setTimeout(() => {
                    window.location.href = 'orders.html';
                }, 1500);
                
            } catch (error) {
                console.error('❌ Ошибка оформления заказа:', error);
                utils.showNotification(`Ошибка: ${error.message}`, 'error');
            }
        });
    }

    // --- Обновление стоимости при изменении даты/времени ---
    const deliveryDateInput = document.getElementById('deliveryDate');
    const deliveryTimeInput = document.getElementById('deliveryTime');
    
    if (deliveryDateInput) {
        deliveryDateInput.addEventListener('change', updateTotalCost);
    }
    if (deliveryTimeInput) {
        deliveryTimeInput.addEventListener('change', updateTotalCost);
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

    // --- Запуск ---
    loadCartItems();
});
