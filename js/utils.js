// utils.js

// Конфигурация
const API_BASE_URL = 'https://edu.std-900.ist.mospolytech.ru/exam-2024-1/api';
const API_KEY = '9ad403f9-e3ca-426a-b8fd-dd56b6d1e783';

// --- Утилиты ---

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) {
        console.log('📢', message);
        return;
    }
    notification.textContent = message;
    notification.className = `notification ${type} visible`;
    setTimeout(() => {
        notification.classList.remove('visible');
    }, 3000);
}

function apiRequest(url, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        let fullUrl;
        if (url.includes('?')) {
            fullUrl = `${API_BASE_URL}${url}&api_key=${API_KEY}`;
        } else {
            fullUrl = `${API_BASE_URL}${url}?api_key=${API_KEY}`;
        }

        console.log('📡 API запрос:', fullUrl);

        const xhr = new XMLHttpRequest();
        xhr.open(method, fullUrl, true);

        if (data && (method === 'POST' || method === 'PUT')) {
            xhr.setRequestHeader('Content-Type', 'application/json');
        }

        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    console.log('✅ API ответ:', response);
                    resolve(response);
                } catch (e) {
                    console.error('❌ Ошибка парсинга JSON:', e);
                    reject(new Error('Ошибка парсинга JSON'));
                }
            } else {
                try {
                    const error = JSON.parse(xhr.responseText);
                    console.error('❌ API ошибка:', error);
                    reject(new Error(error.error || 'Ошибка запроса'));
                } catch (e) {
                    console.error('❌ HTTP ошибка:', xhr.status, xhr.statusText);
                    reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                }
            }
        };

        xhr.onerror = function() {
            const error = new Error('Ошибка сети. Проверьте подключение.');
            console.error('❌ Сетевая ошибка:', error);
            showNotification(`Ошибка сети: ${error.message}`, 'error');
            reject(error);
        };

        xhr.ontimeout = function() {
            const error = new Error('Превышено время ожидания');
            console.error('❌ Timeout:', error);
            showNotification(`Ошибка: ${error.message}`, 'error');
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
        if (!items) return [];
        
        try {
            const parsed = JSON.parse(items);
            
            // МИГРАЦИЯ: Конвертируем старый формат [73, 87] в новый [{id: 73, quantity: 1}, ...]
            if (Array.isArray(parsed) && parsed.length > 0) {
                // Проверяем первый элемент
                if (typeof parsed[0] === 'number') {
                    console.warn('⚠️ Обнаружен старый формат корзины. Миграция данных...');
                    const migrated = parsed.map(id => ({ id: id, quantity: 1 }));
                    this.setItems(migrated);
                    return migrated;
                }
            }
            
            return parsed;
        } catch (e) {
            console.error('Ошибка чтения корзины:', e);
            return [];
        }
    },

    setItems: function(items) {
        try {
            localStorage.setItem(this.KEY, JSON.stringify(items));
            console.log('✅ Корзина обновлена:', items);
        } catch (e) {
            console.error('Ошибка сохранения корзины:', e);
        }
    },

    addItem: function(goodId) {
        console.log('🛒 Добавление товара ID:', goodId);
        const items = this.getItems();
        const existing = items.find(item => item.id === goodId);
        
        if (existing) {
            existing.quantity += 1;
            console.log('✅ Увеличено количество:', existing);
        } else {
            items.push({ id: goodId, quantity: 1 });
            console.log('✅ Новый товар добавлен');
        }
        
        this.setItems(items);
        showNotification('Товар добавлен в корзину', 'success');
        this.updateBadge();
    },

    removeItem: function(goodId) {
        const items = this.getItems();
        const filtered = items.filter(item => item.id !== goodId);
        this.setItems(filtered);
        this.updateBadge();
    },

    updateQuantity: function(goodId, quantity) {
        const items = this.getItems();
        const item = items.find(i => i.id === goodId);
        if (item) {
            item.quantity = parseInt(quantity, 10);
            if (item.quantity <= 0) {
                this.removeItem(goodId);
            } else {
                this.setItems(items);
            }
        }
        this.updateBadge();
    },

    clear: function() {
        localStorage.removeItem(this.KEY);
        this.updateBadge();
    },

    getIds: function() {
        return this.getItems().map(item => item.id);
    },

    getTotalCount: function() {
        return this.getItems().reduce((sum, item) => sum + item.quantity, 0);
    },

    updateBadge: function() {
        const badge = document.getElementById('cartBadge');
        if (badge) {
            const count = this.getTotalCount();
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline' : 'none';
        }
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

// Инициализация
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        Cart.updateBadge();
    });
} else {
    Cart.updateBadge();
}
