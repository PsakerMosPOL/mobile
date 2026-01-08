// utils.js

// Конфигурация
const API_BASE_URL = 'https://edu.std-900.ist.mospolytech.ru/exam-2024-1/api';
const API_KEY = '9ad403f9-e3ca-426a-b8fd-dd56b6d1e783';

// --- Утилиты ---

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) {
        console.error('Элемент уведомления не найден.');
        return;
    }
    notification.textContent = message;
    notification.className = `notification ${type} visible`;
    setTimeout(() => {
        notification.classList.remove('visible');
    }, 5000);
}

function apiRequest(url, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        let fullUrl;
        if (url.includes('?')) {
            fullUrl = `${API_BASE_URL}${url}&api_key=${API_KEY}`;
        } else {
            fullUrl = `${API_BASE_URL}${url}?api_key=${API_KEY}`;
        }

        const xhr = new XMLHttpRequest();
        xhr.open(method, fullUrl, true);

        // Заголовок только для POST/PUT
        if (data && (method === 'POST' || method === 'PUT')) {
            xhr.setRequestHeader('Content-Type', 'application/json');
        }

        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    resolve(response);
                } catch (e) {
                    reject(new Error('Ошибка парсинга JSON'));
                }
            } else {
                try {
                    const error = JSON.parse(xhr.responseText);
                    reject(new Error(error.error || 'Ошибка запроса'));
                } catch (e) {
                    reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                }
            }
        };

        xhr.onerror = function() {
            const error = new Error('Ошибка сети. Проверьте подключение.');
            console.error('API Error:', error);
            showNotification(`Ошибка API: ${error.message}`, 'error');
            reject(error);
        };

        xhr.ontimeout = function() {
            const error = new Error('Превышено время ожидания');
            console.error('API Error:', error);
            showNotification(`Ошибка API: ${error.message}`, 'error');
            reject(error);
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            xhr.send(JSON.stringify(data));
        } else {
            xhr.send();
        }
    });
}

// --- Управление корзиной ---

const Cart = {
    KEY: 'cartItems',

    getItems: function() {
        const items = localStorage.getItem(this.KEY);
        return items ? JSON.parse(items) : [];
    },

    addItem: function(goodId) {
        const items = this.getItems();
        if (!items.includes(goodId)) {
            items.push(goodId);
            localStorage.setItem(this.KEY, JSON.stringify(items));
            showNotification('Товар добавлен в корзину', 'success');
        } else {
            showNotification('Товар уже в корзине', 'info');
        }
    },

    removeItem: function(goodId) {
        const items = this.getItems();
        const index = items.indexOf(goodId);
        if (index > -1) {
            items.splice(index, 1);
            localStorage.setItem(this.KEY, JSON.stringify(items));
        }
    },

    clear: function() {
        localStorage.removeItem(this.KEY);
    },

    getIds: function() {
        return this.getItems();
    }
};

// --- Расчёт стоимости доставки ---

function calculateDeliveryFee(deliveryDate, deliveryInterval) {
    if (!deliveryDate || !deliveryInterval) return 200;

    const date = new Date(deliveryDate);
    const dayOfWeek = date.getDay();
    const [startHour] = deliveryInterval.split('-')[0].split(':');
    const hour = parseInt(startHour, 10);

    let fee = 200;

    if (dayOfWeek === 0 || dayOfWeek === 6) {
        fee += 300;
    } else if (hour >= 18) {
        fee += 200;
    }

    return fee;
}

// --- Экспорт ---
window.utils = {
    apiRequest,
    showNotification,
    Cart,
    calculateDeliveryFee
};
