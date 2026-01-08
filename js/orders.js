// orders.js

document.addEventListener('DOMContentLoaded', function() {
    const ordersList = document.getElementById('ordersList');
    const viewModal = document.getElementById('viewModal');
    const editModal = document.getElementById('editModal');
    const deleteModal = document.getElementById('deleteModal');
    const closeModalButtons = document.querySelectorAll('.close, .btn-close, .btn-cancel');
    const deleteConfirmBtn = document.getElementById('deleteConfirm');
    const deleteCancelBtn = document.getElementById('deleteCancel');

    let currentOrder = null;

    // --- Загрузка заказов ---
    async function loadOrders() {
        try {
            const orders = await utils.apiRequest('/orders');
            renderOrders(orders);
        } catch (error) {
            console.error('Ошибка загрузки заказов:', error);
        }
    }

    // --- Отображение заказов ---
    function renderOrders(orders) {
        ordersList.innerHTML = '';
        orders.forEach((order, index) => {
            const row = document.createElement('tr');
            // Получаем имена товаров для отображения в составе
            const goodsNames = order.goods ? order.goods.map(g => g.name).join(', ') : 'Данные недоступны';
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${new Date(order.created_at).toLocaleString()}</td>
                <td>${goodsNames}</td>
                <td>${order.total_cost || 'N/A'} ₽</td>
                <td>${order.delivery_date} ${order.delivery_interval}</td>
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
    function openViewModal(e) {
        const orderId = parseInt(e.target.dataset.id, 10);
        utils.apiRequest(`/orders/${orderId}`)
            .then(order => {
                const goodsList = order.goods ? order.goods.map(g => g.name).join('<br>') : 'Данные недоступны';
                document.getElementById('viewOrderDetails').innerHTML = `
                    <p><strong>Имя:</strong> ${order.full_name}</p>
                    <p><strong>Email:</strong> ${order.email}</p>
                    <p><strong>Телефон:</strong> ${order.phone}</p>
                    <p><strong>Адрес:</strong> ${order.delivery_address}</p>
                    <p><strong>Дата:</strong> ${order.delivery_date}</p>
                    <p><strong>Интервал:</strong> ${order.delivery_interval}</p>
                    <p><strong>Комментарий:</strong> ${order.comment || 'Нет'}</p>
                    <p><strong>Товары:</strong><br>${goodsList}</p>
                `;
                viewModal.classList.remove('hidden');
            })
            .catch(error => console.error('Ошибка загрузки заказа для просмотра:', error));
    }

    // --- Модальное окно редактирования ---
    function openEditModal(e) {
        const orderId = parseInt(e.target.dataset.id, 10);
        utils.apiRequest(`/orders/${orderId}`)
            .then(order => {
                currentOrder = order;
                document.getElementById('editOrderId').value = order.id;
                document.getElementById('editFullName').value = order.full_name;
                document.getElementById('editEmail').value = order.email;
                document.getElementById('editPhone').value = order.phone;
                document.getElementById('editDeliveryAddress').value = order.delivery_address;
                document.getElementById('editDeliveryDate').value = order.delivery_date.split('T')[0]; // Формат YYYY-MM-DD
                document.getElementById('editDeliveryInterval').value = order.delivery_interval;
                document.getElementById('editComment').value = order.comment || '';
                editModal.classList.remove('hidden');
            })
            .catch(error => console.error('Ошибка загрузки заказа для редактирования:', error));
    }

    document.getElementById('editOrderForm').addEventListener('submit', async function(e) {
        e.preventDefault();
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
            const updatedOrder = await utils.apiRequest(`/orders/${currentOrder.id}`, 'PUT', orderData);
            utils.showNotification('Заказ обновлён!', 'success');
            editModal.classList.add('hidden');
            loadOrders(); // Перезагрузить список
        } catch (error) {
            console.error('Ошибка редактирования заказа:', error);
        }
    });

    // --- Модальное окно удаления ---
    function openDeleteModal(e) {
        const orderId = parseInt(e.target.dataset.id, 10);
        currentOrder = { id: orderId };
        deleteModal.classList.remove('hidden');
    }

    deleteConfirmBtn.addEventListener('click', async function() {
        try {
            await utils.apiRequest(`/orders/${currentOrder.id}`, 'DELETE');
            utils.showNotification('Заказ удалён!', 'info');
            deleteModal.classList.add('hidden');
            loadOrders(); // Перезагрузить список
        } catch (error) {
            console.error('Ошибка удаления заказа:', error);
        }
    });

    // --- Закрытие модальных окон ---
    closeModalButtons.forEach(button => {
        button.addEventListener('click', function() {
            viewModal.classList.add('hidden');
            editModal.classList.add('hidden');
            deleteModal.classList.add('hidden');
        });
    });

    // --- Инициализация ---
    loadOrders();
});