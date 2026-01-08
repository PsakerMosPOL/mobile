// utils.js

// Используем HTTPS адрес, он работает стабильнее
const API_BASE_URL = 'https://edu.std-900.ist.mospolytech.ru/exam-2024-1/api';

// Ваш персональный ключ
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
    // ИСПРАВЛЕНИЕ: Проверяем, есть ли уже параметры в URL
    let fullUrl;
    if (url.includes('?')) {
        // Если параметры уже есть (например /goods?page=1), добавляем ключ через &
        fullUrl = `${API_BASE_URL}${url}&api_key=${API_KEY}`;
    } else {
        // Если параметров нет (например /orders), добавляем ключ через ?
        fullUrl = `${API_BASE_URL}${url}?api_key=${API_KEY}`;
    }
    
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
    }

    return fetch(fullUrl, options)
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.error || 'Ошибка запроса'); });
            }
            return response.json();
        })
        .catch(error => {
            console.error('API Error:', error);
            // Если ошибка сети (Failed to fetch), выводим более понятное сообщение
            const msg = error.message === 'Failed to fetch' 
                ? 'Ошибка сети. Проверьте подключение или запустите сервер.' 
                : error.message;
            showNotification(`Ошибка API: ${msg}`, 'error');
            throw error;
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
    if (!deliveryDate) return 200;

    const date = new Date(deliveryDate);
    const dayOfWeek = date.getDay(); // 0 - воскресенье, 6 - суббота
    
    // Защита от пустого интервала
    if (!deliveryInterval) return 200;
    
    const [startHour] = deliveryInterval.split('-')[0].split(':');
    const hour = parseInt(startHour, 10);

    let fee = 200; // Базовая стоимость

    if (dayOfWeek === 0 || dayOfWeek === 6) { // Выходные
        fee += 300;
    } else if (hour >= 18) { // Будни, вечер
        fee += 200;
    }

    return fee;
}

// --- Экспорт функций для использования в других файлах ---
window.utils = {
    apiRequest,
    showNotification,
    Cart,
    calculateDeliveryFee
};
