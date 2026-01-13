// orders.js - ФИНАЛЬНАЯ ВЕРСИЯ С РЕАЛЬНЫМИ НАЗВАНИЯМИ ТОВАРОВ

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Инициализация страницы заказов');
    
    const ordersList = document.getElementById('ordersList');
    const viewModal = document.getElementById('viewModal');
    const editModal = document.getElementById('editModal');
    const deleteModal = document.getElementById('deleteModal');
    const closeModalButtons = document.querySelectorAll('.close, .btn-close, .btn-cancel');
    const deleteConfirmBtn = document.getElementById('deleteConfirm');
    const deleteCancelBtn = document.getElementById('deleteCancel');
    
    if (!ordersList) {
        console.error('❌ Элемент #ordersList не найден!');
        return;
    }
    
    [viewModal, editModal, deleteModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    closeModals();
                }
            });
        }
    });

    let currentOrder = null;

    function closeModals() {
        if (viewModal) viewModal.style.display = 'none';
        if (editModal) editModal.style.display = 'none';
        if (deleteModal) deleteModal.style.display = 'none';
    }

    // --- Загрузка заказов ---
    async function loadOrders() {
        try {
            console.log('📦 Загрузка заказов...');
            const orders = await utils.apiRequest('/orders');
            console.log('✅ Заказы загружены:', orders);
            
            renderOrders(Array.isArray(orders) ? orders : []);
        } catch (error) {
            console.error('❌ Ошибка загрузки заказов:', error);
            utils.showNotification('Ошибка загрузки заказов', 'error');
            
            if (ordersList) {
                ordersList.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: #dc3545;">Ошибка загрузки заказов</td></tr>';
            }
        }
    }

    // --- Отображение заказов (С РЕАЛЬНЫМИ НАЗВАНИЯМИ ТОВАРОВ) ---
    async function renderOrders(orders) {
        if (!ordersList) return;
        
        ordersList.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: #999;">Загрузка заказов...</td></tr>';
        
        if (orders.length === 0) {
            ordersList.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: #666;">У вас пока нет заказов</td></tr>';
            return;
        }

        ordersList.innerHTML = '';
        let orderIndex = 1;

        // Загружаем товары для каждого заказа
        for (const order of orders) {
            let totalCost = 0;
            let goodsNames = [];
            
            // Загружаем реальные названия товаров и вычисляем стоимость
            if (order.good_ids && order.good_ids.length > 0) {
                try {
                    const goodsPromises = order.good_ids.map(id => utils.apiRequest(`/goods/${id}`));
                    const goods = await Promise.all(goodsPromises);
                    
                    // Собираем реальные названия и считаем стоимость
                    goodsNames = goods.map(g => g.name);
                    totalCost = goods.reduce((sum, g) => sum + (g.discount_price || g.actual_price || 0), 0);
                    
                    console.log(`💰 Заказ #${order.id}: ${totalCost} ₽ - товары: ${goodsNames.join(', ')}`);
                } catch (err) {
                    console.warn('⚠️ Ошибка загрузки товаров для заказа', order.id, err);
                    goodsNames = ['Ошибка загрузки товаров'];
                    totalCost = order.total_cost || 0;
                }
            } else {
                goodsNames = ['Нет товаров'];
                totalCost = order.total_cost || 0;
            }

            // Форматируем названия товаров (обрезаем длинные названия)
            const goodsDisplay = goodsNames
                .map(name => name.length > 40 ? name.substring(0, 40) + '...' : name)
                .join(', ');

            // Создаём строку таблицы
            const row = document.createElement('tr');
            row.style.cssText = 'transition: background 0.2s;';
            
            const createdDate = order.created_at 
                ? new Date(order.created_at).toLocaleString('ru-RU', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                }) 
                : 'N/A';
            
            const deliveryInfo = `${order.delivery_date || 'Не указана'}<br><span style="color: #666; font-size: 0.9rem;">${order.delivery_interval || ''}</span>`;
            
            row.innerHTML = `
                <td style="padding: 1rem; text-align: center; font-weight: 600;">${orderIndex}.</td>
                <td style="padding: 1rem; color: #333;">${createdDate}</td>
                <td style="padding: 1rem; color: #666; max-width: 300px;">${goodsDisplay}</td>
                <td style="padding: 1rem; font-weight: 700; color: #cb11ab; font-size: 1.1rem;">${totalCost} ₽</td>
                <td style="padding: 1rem;">${deliveryInfo}</td>
                <td style="padding: 1rem; text-align: center;">
                    <button class="action-btn view-btn" data-id="${order.id}" title="Просмотр">
                        <span class="btn-icon">👁️</span>
                    </button>
                    <button class="action-btn edit-btn" data-id="${order.id}" title="Редактировать">
                        <span class="btn-icon">✏️</span>
                    </button>
                    <button class="action-btn delete-btn" data-id="${order.id}" title="Удалить">
                        <span class="btn-icon">🗑️</span>
                    </button>
                </td>
            `;
            
            row.addEventListener('mouseenter', () => row.style.background = '#f9f9f9');
            row.addEventListener('mouseleave', () => row.style.background = 'white');
            
            ordersList.appendChild(row);
            orderIndex++;
        }

        // Добавляем обработчики кнопок
        document.querySelectorAll('.view-btn').forEach(btn => btn.addEventListener('click', openViewModal));
        document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', openEditModal));
        document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', openDeleteModal));
    }

    // --- Модальное окно просмотра (С КАРТОЧКАМИ ТОВАРОВ) ---
    async function openViewModal(e) {
        const orderId = parseInt(e.currentTarget.dataset.id, 10);
        try {
            console.log('👁️ Просмотр заказа:', orderId);
            const order = await utils.apiRequest(`/orders/${orderId}`);
            
            let goodsHTML = '<p style="text-align: center; color: #999;">Загрузка товаров...</p>';
            let totalItemsCost = 0;
            
            if (order.good_ids && order.good_ids.length > 0) {
                try {
                    const goodsPromises = order.good_ids.map(id => utils.apiRequest(`/goods/${id}`));
                    const goods = await Promise.all(goodsPromises);
                    
                    // Создаём карточки товаров
                    goodsHTML = '<div style="display: grid; gap: 1rem; margin-top: 1rem;">';
                    
                    goods.forEach(g => {
                        const price = g.discount_price || g.actual_price || 0;
                        const imageUrl = g.image_url || 'https://via.placeholder.com/100x100?text=No+Image';
                        const shortName = g.name.length > 50 ? g.name.substring(0, 50) + '...' : g.name;
                        totalItemsCost += price;
                        
                        goodsHTML += `
                            <div style="display: flex; gap: 1rem; padding: 1rem; background: #f9f9f9; border-radius: 8px; align-items: flex-start;">
                                <img src="${imageUrl}" 
                                     alt="${g.name}" 
                                     style="width: 100px; height: 100px; border-radius: 6px; object-fit: cover; background: white; padding: 4px; border: 1px solid #ddd;"
                                     onerror="this.src='https://via.placeholder.com/100x100?text=No+Image'">
                                <div style="flex: 1;">
                                    <p style="margin: 0 0 0.5rem 0; font-weight: 600; font-size: 0.95rem; color: #333;">${shortName}</p>
                                    <p style="margin: 0; color: #cb11ab; font-weight: 700; font-size: 1.1rem;">${price} ₽</p>
                                </div>
                            </div>
                        `;
                    });
                    
                    // Добавляем итоговую сумму
                    goodsHTML += `
                        <div style="padding: 1rem; background: linear-gradient(135deg, #f0e6f6 0%, #e6d9f0 100%); border-radius: 8px; border-left: 4px solid #cb11ab;">
                            <p style="margin: 0; font-weight: 700; color: #cb11ab; font-size: 1.15rem;">💰 Итого за товары: ${totalItemsCost} ₽</p>
                        </div>
                    </div>`;
                    
                } catch (err) {
                    console.error('Ошибка загрузки товаров:', err);
                    goodsHTML = '<p style="color: #dc3545;">❌ Ошибка загрузки товаров</p>';
                }
            } else {
                goodsHTML = '<p style="color: #999;">📦 Нет товаров в заказе</p>';
            }
            
            const viewOrderDetails = document.getElementById('viewOrderDetails');
            if (viewOrderDetails) {
                viewOrderDetails.innerHTML = `
                    <div style="display: grid; gap: 1.25rem; font-size: 1rem; line-height: 1.6;">
                        <div class="detail-row">
                            <span class="detail-label">Дата оформления</span>
                            <span class="detail-value">${new Date(order.created_at).toLocaleString('ru-RU', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'})}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Имя</span>
                            <span class="detail-value">${order.full_name}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Номер телефона</span>
                            <span class="detail-value">${order.phone}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Email</span>
                            <span class="detail-value">${order.email}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Адрес доставки</span>
                            <span class="detail-value">${order.delivery_address}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Дата доставки</span>
                            <span class="detail-value">${order.delivery_date}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Время доставки</span>
                            <span class="detail-value">${order.delivery_interval}</span>
                        </div>
                    </div>
                    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 1.5rem 0;">
                    <h3 style="margin-bottom: 1rem; font-size: 1.1rem; color: #333;">🛒 Состав заказа</h3>
                    ${goodsHTML}
                `;
            }
            
            if (viewModal) viewModal.style.display = 'flex';
        } catch (error) {
            console.error('❌ Ошибка просмотра заказа:', error);
            utils.showNotification('Ошибка загрузки данных заказа', 'error');
        }
    }

    // --- Модальное окно редактирования (С КАРТОЧКАМИ ТОВАРОВ) ---
    async function openEditModal(e) {
        const orderId = parseInt(e.currentTarget.dataset.id, 10);
        try {
            console.log('✏️ Редактирование заказа:', orderId);
            const order = await utils.apiRequest(`/orders/${orderId}`);
            currentOrder = order;
            
            const editOrderId = document.getElementById('editOrderId');
            const editFullName = document.getElementById('editFullName');
            const editEmail = document.getElementById('editEmail');
            const editPhone = document.getElementById('editPhone');
            const editDeliveryAddress = document.getElementById('editDeliveryAddress');
            const editDeliveryDate = document.getElementById('editDeliveryDate');
            const editDeliveryInterval = document.getElementById('editDeliveryInterval');
            const editComment = document.getElementById('editComment');
            const editOrderGoods = document.getElementById('editOrderGoods');
            
            if (editOrderId) editOrderId.value = order.id;
            if (editFullName) editFullName.value = order.full_name;
            if (editEmail) editEmail.value = order.email;
            if (editPhone) editPhone.value = order.phone;
            if (editDeliveryAddress) editDeliveryAddress.value = order.delivery_address;
            
            if (editDeliveryDate && order.delivery_date) {
                const [day, month, year] = order.delivery_date.split('.');
                editDeliveryDate.value = `${year}-${month}-${day}`;
            }
            
            if (editDeliveryInterval) editDeliveryInterval.value = order.delivery_interval;
            if (editComment) editComment.value = order.comment || '';
            
            // Загрузка товаров с изображениями и ценами
            if (editOrderGoods) {
                editOrderGoods.innerHTML = '<p style="text-align: center; color: #999;">Загрузка товаров...</p>';
                
                if (order.good_ids && order.good_ids.length > 0) {
                    try {
                        const goodsPromises = order.good_ids.map(id => utils.apiRequest(`/goods/${id}`));
                        const goods = await Promise.all(goodsPromises);
                        
                        let goodsHTML = '<div style="display: grid; gap: 1rem;">';
                        let totalPrice = 0;
                        
                        goods.forEach(g => {
                            const price = g.discount_price || g.actual_price || 0;
                            const imageUrl = g.image_url || 'https://via.placeholder.com/100x100?text=No+Image';
                            const shortName = g.name.length > 50 ? g.name.substring(0, 50) + '...' : g.name;
                            totalPrice += price;
                            
                            goodsHTML += `
                                <div style="display: flex; gap: 1rem; padding: 1rem; background: #f9f9f9; border-radius: 8px; align-items: flex-start;">
                                    <img src="${imageUrl}" 
                                         alt="${g.name}" 
                                         style="width: 100px; height: 100px; border-radius: 6px; object-fit: cover; background: white; padding: 4px; border: 1px solid #ddd;"
                                         onerror="this.src='https://via.placeholder.com/100x100?text=No+Image'">
                                    <div style="flex: 1;">
                                        <p style="margin: 0 0 0.5rem 0; font-weight: 600; font-size: 0.95rem; color: #333;">${shortName}</p>
                                        <p style="margin: 0; color: #cb11ab; font-weight: 700; font-size: 1.1rem;">${price} ₽</p>
                                    </div>
                                </div>
                            `;
                        });
                        
                        goodsHTML += `
                            <div style="padding: 1rem; background: linear-gradient(135deg, #f0e6f6 0%, #e6d9f0 100%); border-radius: 8px; border-left: 4px solid #cb11ab;">
                                <p style="margin: 0; font-weight: 700; color: #cb11ab; font-size: 1.15rem;">💰 Итого за товары: ${totalPrice} ₽</p>
                            </div>
                        </div>`;
                        
                        editOrderGoods.innerHTML = goodsHTML;
                    } catch (err) {
                        console.error('Ошибка загрузки товаров:', err);
                        editOrderGoods.innerHTML = '<p style="color: #dc3545; text-align: center;">❌ Ошибка загрузки товаров</p>';
                    }
                } else {
                    editOrderGoods.innerHTML = '<p style="color: #999; text-align: center;">📦 Нет товаров в заказе</p>';
                }
            }
            
            if (editModal) editModal.style.display = 'flex';
        } catch (error) {
            console.error('❌ Ошибка загрузки заказа:', error);
            utils.showNotification('Ошибка загрузки заказа', 'error');
        }
    }

    // Обработчик формы редактирования
    const editOrderForm = document.getElementById('editOrderForm');
    if (editOrderForm) {
        editOrderForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!currentOrder) {
                utils.showNotification('Ошибка: заказ не выбран', 'error');
                return;
            }

            const editDeliveryDate = document.getElementById('editDeliveryDate');
            if (!editDeliveryDate || !editDeliveryDate.value) {
                utils.showNotification('Укажите дату доставки', 'error');
                return;
            }

            const [year, month, day] = editDeliveryDate.value.split('-');
            const deliveryDateFormatted = `${day}.${month}.${year}`;

            const orderData = {
                full_name: document.getElementById('editFullName')?.value || '',
                email: document.getElementById('editEmail')?.value || '',
                phone: document.getElementById('editPhone')?.value || '',
                delivery_address: document.getElementById('editDeliveryAddress')?.value || '',
                delivery_date: deliveryDateFormatted,
                delivery_interval: document.getElementById('editDeliveryInterval')?.value || '',
                comment: document.getElementById('editComment')?.value || ''
            };

            try {
                await utils.apiRequest(`/orders/${currentOrder.id}`, 'PUT', orderData);
                utils.showNotification('Заказ успешно обновлён!', 'success');
                if (editModal) editModal.style.display = 'none';
                loadOrders();
            } catch (error) {
                console.error('❌ Ошибка редактирования заказа:', error);
                utils.showNotification('Ошибка обновления заказа', 'error');
            }
        });
    }

    // --- Модальное окно удаления ---
    function openDeleteModal(e) {
        const orderId = parseInt(e.currentTarget.dataset.id, 10);
        currentOrder = { id: orderId };
        if (deleteModal) deleteModal.style.display = 'flex';
    }

    if (deleteConfirmBtn) {
        deleteConfirmBtn.addEventListener('click', async function() {
            if (!currentOrder) {
                utils.showNotification('Ошибка: заказ не выбран', 'error');
                return;
            }

            try {
                await utils.apiRequest(`/orders/${currentOrder.id}`, 'DELETE');
                utils.showNotification('Заказ успешно удалён!', 'info');
                if (deleteModal) deleteModal.style.display = 'none';
                loadOrders();
            } catch (error) {
                console.error('❌ Ошибка удаления заказа:', error);
                utils.showNotification('Ошибка удаления заказа', 'error');
            }
        });
    }

    if (deleteCancelBtn) {
        deleteCancelBtn.addEventListener('click', function() {
            if (deleteModal) deleteModal.style.display = 'none';
        });
    }

    closeModalButtons.forEach(button => {
        button.addEventListener('click', closeModals);
    });

    loadOrders();
});
