// orders.js - ИСПРАВЛЕННАЯ ВЕРСИЯ

document.addEventListener('DOMContentLoaded', function() {
    const ordersList = document.getElementById('ordersList');
    const viewModal = document.getElementById('viewModal');
    const editModal = document.getElementById('editModal');
    const deleteModal = document.getElementById('deleteModal');
    const closeModalButtons = document.querySelectorAll('.close, .btn-close, .btn-cancel');
    const deleteConfirmBtn = document.getElementById('deleteConfirm');
    const deleteCancelBtn = document.getElementById('deleteCancel');
    
    // Обработчики для закрытия по клику на фон
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

    // --- Закрытие модальных окон ---
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
            ordersList.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #dc3545;">Ошибка загрузки заказов</td></tr>';
        }
    }

    // --- Отображение заказов ---
    function renderOrders(orders) {
        ordersList.innerHTML = '';
        
        if (orders.length === 0) {
            ordersList.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #666;">У вас пока нет заказов</td></tr>';
            return;
        }

        orders.forEach((order, index) => {
            const row = document.createElement('tr');
            
            // ИСПРАВЛЕНО: форматирование даты из ISO
            const createdDate = order.created_at ? 
                new Date(order.created_at).toLocaleString('ru-RU', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : 'N/A';
            
            // ИСПРАВЛЕНО: состав заказа (показываем количество товаров)
            const goodsCount = order.good_ids ? order.good_ids.length : 0;
            const goodsText = `Товаров: ${goodsCount}`;
            
            // ИСПРАВЛЕНО: стоимость (можно рассчитать на основе товаров)
            const cost = order.total_cost || 'N/A';
            
            // Форматируем дату доставки
            const deliveryInfo = `${order.delivery_date || ''}<br>${order.delivery_interval || ''}`;
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${createdDate}</td>
                <td>${goodsText}</td>
                <td>${cost} ₽</td>
                <td>${deliveryInfo}</td>
                <td class="actions">
                    <button class="view" data-id="${order.id}">👁️</button>
                    <button class="edit" data-id="${order.id}">✏️</button>
                    <button class="delete" data-id="${order.id}">🗑️</button>
                </td>
            `;
            ordersList.appendChild(row);
        });

        // Добавляем обработчики для кнопок
        document.querySelectorAll('.view').forEach(btn => btn.addEventListener('click', openViewModal));
        document.querySelectorAll('.edit').forEach(btn => btn.addEventListener('click', openEditModal));
        document.querySelectorAll('.delete').forEach(btn => btn.addEventListener('click', openDeleteModal));
    }

    // --- Модальное окно просмотра ---
    async function openViewModal(e) {
        const orderId = parseInt(e.target.dataset.id, 10);
        try {
            console.log('👁️ Просмотр заказа:', orderId);
            const order = await utils.apiRequest(`/orders/${orderId}`);
            
            // Загружаем информацию о товарах
            let goodsList = '<li>Загрузка...</li>';
            let totalItemsCost = 0;
            
            if (order.good_ids && order.good_ids.length > 0) {
                try {
                    const goodsPromises = order.good_ids.map(id => utils.apiRequest(`/goods/${id}`));
                    const goods = await Promise.all(goodsPromises);
                    
                    goodsList = goods.map(g => {
                        const price = g.discount_price || g.actual_price;
                        totalItemsCost += price;
                        return `<li>${g.name} - ${price} ₽</li>`;
                    }).join('');
                } catch (err) {
                    console.error('Ошибка загрузки товаров:', err);
                    goodsList = '<li>Ошибка загрузки товаров</li>';
                }
            }
            
            const deliveryFee = utils.calculateDeliveryFee(order.delivery_date, order.delivery_interval);
            const totalCost = totalItemsCost + deliveryFee;
            
            document.getElementById('viewOrderDetails').innerHTML = `
                <div style="display: grid; gap: 0.75rem;">
                    <p><strong>Имя:</strong> ${order.full_name}</p>
                    <p><strong>Email:</strong> ${order.email}</p>
                    <p><strong>Телефон:</strong> ${order.phone}</p>
                    <p><strong>Адрес доставки:</strong> ${order.delivery_address}</p>
                    <p><strong>Дата доставки:</strong> ${order.delivery_date}</p>
                    <p><strong>Временной интервал:</strong> ${order.delivery_interval}</p>
                    <p><strong>Комментарий:</strong> ${order.comment || 'Нет'}</p>
                    <hr>
                    <p><strong>Товары:</strong></p>
                    <ul style="margin-left: 1.5rem;">${goodsList}</ul>
                    <hr>
                    <p><strong>Стоимость товаров:</strong> ${totalItemsCost} ₽</p>
                    <p><strong>Стоимость доставки:</strong> ${deliveryFee} ₽</p>
                    <p style="font-size: 1.2rem; font-weight: 700;"><strong>Итого:</strong> ${totalCost} ₽</p>
                </div>
            `;
            viewModal.style.display = 'flex';
        } catch (error) {
            console.error('❌ Ошибка просмотра заказа:', error);
            utils.showNotification('Ошибка загрузки данных заказа', 'error');
        }
    }

    // --- Модальное окно редактирования ---
    async function openEditModal(e) {
        const orderId = parseInt(e.target.dataset.id, 10);
        try {
            console.log('✏️ Редактирование заказа:', orderId);
            const order = await utils.apiRequest(`/orders/${orderId}`);
            currentOrder = order;
            
            // Заполняем форму
            document.getElementById('editOrderId').value = order.id;
            document.getElementById('editFullName').value = order.full_name;
            document.getElementById('editEmail').value = order.email;
            document.getElementById('editPhone').value = order.phone;
            document.getElementById('editDeliveryAddress').value = order.delivery_address;
            
            // ИСПРАВЛЕНО: конвертация dd.mm.yyyy в YYYY-MM-DD
            const [day, month, year] = order.delivery_date.split('.');
            document.getElementById('editDeliveryDate').value = `${year}-${month}-${day}`;
            
            document.getElementById('editDeliveryInterval').value = order.delivery_interval;
            document.getElementById('editComment').value = order.comment || '';
            
            editModal.style.display = 'flex';
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

            // ИСПРАВЛЕНО: конвертация YYYY-MM-DD в dd.mm.yyyy
            const deliveryDateInput = document.getElementById('editDeliveryDate').value;
            const [year, month, day] = deliveryDateInput.split('-');
            const deliveryDateFormatted = `${day}.${month}.${year}`;

            const orderData = {
                full_name: document.getElementById('editFullName').value,
                email: document.getElementById('editEmail').value,
                phone: document.getElementById('editPhone').value,
                delivery_address: document.getElementById('editDeliveryAddress').value,
                delivery_date: deliveryDateFormatted,
                delivery_interval: document.getElementById('editDeliveryInterval').value,
                comment: document.getElementById('editComment').value,
                good_ids: currentOrder.good_ids // ВАЖНО: сохраняем товары
            };

            console.log('📤 Обновление заказа:', orderData);

            try {
                await utils.apiRequest(`/orders/${currentOrder.id}`, 'PUT', orderData);
                utils.showNotification('Заказ успешно обновлён!', 'success');
                editModal.style.display = 'none';
                loadOrders();
            } catch (error) {
                console.error('❌ Ошибка обновления:', error);
                utils.showNotification(`Ошибка: ${error.message}`, 'error');
            }
        });
    }

    // --- Модальное окно удаления ---
    function openDeleteModal(e) {
        const orderId = parseInt(e.target.dataset.id, 10);
        currentOrder = { id: orderId };
        deleteModal.style.display = 'flex';
    }

    // Подтверждение удаления
    if (deleteConfirmBtn) {
        deleteConfirmBtn.addEventListener('click', async function() {
            if (!currentOrder) return;

            try {
                console.log('🗑️ Удаление заказа:', currentOrder.id);
                await utils.apiRequest(`/orders/${currentOrder.id}`, 'DELETE');
                utils.showNotification('Заказ успешно удалён!', 'success');
                deleteModal.style.display = 'none';
                loadOrders();
            } catch (error) {
                console.error('❌ Ошибка удаления:', error);
                utils.showNotification(`Ошибка: ${error.message}`, 'error');
            }
        });
    }

    // Отмена удаления
    if (deleteCancelBtn) {
        deleteCancelBtn.addEventListener('click', function() {
            deleteModal.style.display = 'none';
        });
    }

    // Закрытие модальных окон
    closeModalButtons.forEach(button => {
        button.addEventListener('click', closeModals);
    });

    // --- Инициализация ---
    console.log('🚀 Инициализация страницы заказов');
    loadOrders();
});
