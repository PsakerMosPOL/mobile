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
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModals();
            }
        });
    });

    let currentOrder = null;

    // --- Закрытие модальных окон ---
    function closeModals() {
        viewModal.style.display = 'none';
        editModal.style.display = 'none';
        deleteModal.style.display = 'none';
    }

    // --- Загрузка заказов ---
    async function loadOrders() {
        try {
            const orders = await utils.apiRequest('/orders');
            renderOrders(orders);
        } catch (error) {
            console.error('Ошибка загрузки заказов:', error);
            utils.showNotification('Ошибка загрузки заказов', 'error');
        }
    }

    // --- Отображение заказов ---
    function renderOrders(orders) {
        ordersList.innerHTML = '';
        if (orders.length === 0) {
            ordersList.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">У вас пока нет заказов</td></tr>';
            return;
        }

        orders.forEach((order, index) => {
            const row = document.createElement('tr');
            // Получаем имена товаров для отображения в составе
            const goodsNames = order.goods ? order.goods.map(g => g.name).join(', ') : 'Данные недоступны';
            
            // Форматируем дату создания
            const createdDate = order.created_at ? new Date(order.created_at).toLocaleString('ru-RU') : 'N/A';
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${createdDate}</td>
                <td>${goodsNames}</td>
                <td>${order.total_cost || 'N/A'} ₽</td>
                <td>${order.delivery_date || ''} ${order.delivery_interval || ''}</td>
                <td class="actions">
                    <button class="view" data-id="${order.id}">Просмотр</button>
                    <button class="edit" data-id="${order.id}">Редактировать</button>
                    <button class="delete" data-id="${order.id}">Удалить</button>
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
            const order = await utils.apiRequest(`/orders/${orderId}`);
            const goodsList = order.goods ? 
                order.goods.map(g => `<li>${g.name} - ${g.price || g.actual_price} ₽</li>`).join('') : 
                '<li>Данные недоступны</li>';
            
            const totalItemsCost = order.goods ? 
                order.goods.reduce((sum, g) => sum + (g.price || g.actual_price || 0), 0) : 0;
            
            const deliveryFee = order.total_cost ? (order.total_cost - totalItemsCost) : 0;
            
            document.getElementById('viewOrderDetails').innerHTML = `
                <div style="display: grid; gap: 0.5rem;">
                    <p><strong>Статус заказа:</strong> ${order.status || 'Оформлен'}</p>
                    <p><strong>Имя:</strong> ${order.full_name}</p>
                    <p><strong>Email:</strong> ${order.email}</p>
                    <p><strong>Телефон:</strong> ${order.phone}</p>
                    <p><strong>Адрес доставки:</strong> ${order.delivery_address}</p>
                    <p><strong>Дата доставки:</strong> ${order.delivery_date}</p>
                    <p><strong>Временной интервал:</strong> ${order.delivery_interval}</p>
                    <p><strong>Комментарий:</strong> ${order.comment || 'Нет комментария'}</p>
                    <p><strong>Товары:</strong></p>
                    <ul style="margin-left: 1rem; margin-bottom: 0.5rem;">${goodsList}</ul>
                    <p><strong>Стоимость товаров:</strong> ${totalItemsCost} ₽</p>
                    <p><strong>Стоимость доставки:</strong> ${deliveryFee} ₽</p>
                    <p><strong>Итоговая стоимость:</strong> ${order.total_cost || totalItemsCost + deliveryFee} ₽</p>
                </div>
            `;
            viewModal.style.display = 'flex';
        } catch (error) {
            console.error('Ошибка загрузки заказа для просмотра:', error);
            utils.showNotification('Ошибка загрузки данных заказа', 'error');
        }
    }

    // --- Модальное окно редактирования ---
    async function openEditModal(e) {
        const orderId = parseInt(e.target.dataset.id, 10);
        try {
            const order = await utils.apiRequest(`/orders/${orderId}`);
            currentOrder = order;
            
            // Заполняем форму данными
            document.getElementById('editOrderId').value = order.id;
            document.getElementById('editFullName').value = order.full_name;
            document.getElementById('editEmail').value = order.email;
            document.getElementById('editPhone').value = order.phone;
            document.getElementById('editDeliveryAddress').value = order.delivery_address;
            
            // Форматируем дату для input[type="date"]
            const deliveryDate = order.delivery_date ? 
                order.delivery_date.split('T')[0] : 
                new Date().toISOString().split('T')[0];
            document.getElementById('editDeliveryDate').value = deliveryDate;
            
            document.getElementById('editDeliveryInterval').value = order.delivery_interval;
            document.getElementById('editComment').value = order.comment || '';
            
            editModal.style.display = 'flex';
        } catch (error) {
            console.error('Ошибка загрузки заказа для редактирования:', error);
            utils.showNotification('Ошибка загрузки заказа', 'error');
        }
    }

    // Обработчик отправки формы редактирования
    document.getElementById('editOrderForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!currentOrder) {
            utils.showNotification('Ошибка: заказ не выбран', 'error');
            return;
        }

        const orderData = {
            full_name: document.getElementById('editFullName').value,
            email: document.getElementById('editEmail').value,
            phone: document.getElementById('editPhone').value,
            delivery_address: document.getElementById('editDeliveryAddress').value,
            delivery_date: document.getElementById('editDeliveryDate').value,
            delivery_interval: document.getElementById('editDeliveryInterval').value,
            comment: document.getElementById('editComment').value
        };

        try {
            await utils.apiRequest(`/orders/${currentOrder.id}`, 'PUT', orderData);
            utils.showNotification('Заказ успешно обновлён!', 'success');
            editModal.style.display = 'none';
            loadOrders(); // Перезагружаем список заказов
        } catch (error) {
            console.error('Ошибка редактирования заказа:', error);
            utils.showNotification('Ошибка обновления заказа', 'error');
        }
    });

    // --- Модальное окно удаления ---
    function openDeleteModal(e) {
        const orderId = parseInt(e.target.dataset.id, 10);
        currentOrder = { id: orderId };
        deleteModal.style.display = 'flex';
    }

    // Обработчик подтверждения удаления
    deleteConfirmBtn.addEventListener('click', async function() {
        if (!currentOrder) {
            utils.showNotification('Ошибка: заказ не выбран', 'error');
            return;
        }

        try {
            await utils.apiRequest(`/orders/${currentOrder.id}`, 'DELETE');
            utils.showNotification('Заказ успешно удалён!', 'info');
            deleteModal.style.display = 'none';
            loadOrders(); // Перезагружаем список заказов
        } catch (error) {
            console.error('Ошибка удаления заказа:', error);
            utils.showNotification('Ошибка удаления заказа', 'error');
        }
    });

    // Обработчик отмены удаления
    if (deleteCancelBtn) {
        deleteCancelBtn.addEventListener('click', function() {
            deleteModal.style.display = 'none';
        });
    }

    // --- Закрытие модальных окон при клике на кнопки закрытия ---
    closeModalButtons.forEach(button => {
        button.addEventListener('click', closeModals);
    });

    // --- Инициализация ---
    loadOrders();
});
