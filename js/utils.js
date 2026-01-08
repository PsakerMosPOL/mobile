// utils.js
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

        // Добавляем заголовок ТОЛЬКО для POST/PUT с данными
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
            reject(new Error('Ошибка сети. Проверьте подключение.'));
        };

        xhr.ontimeout = function() {
            reject(new Error('Превышено время ожидания ответа'));
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            xhr.send(JSON.stringify(data));
        } else {
            xhr.send();
        }
    })
    .catch(error => {
        console.error('API Error:', error);
        showNotification(`Ошибка API: ${error.message}`, 'error');
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

