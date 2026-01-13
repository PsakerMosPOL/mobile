// main.js

document.addEventListener('DOMContentLoaded', function() {
    const goodsContainer = document.getElementById('goodsContainer');
    const sortOrderSelect = document.getElementById('sortOrder');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const autocompleteList = document.getElementById('autocomplete-list');
    const loadMoreBtn = document.getElementById('loadMore');
    const applyFilterBtn = document.getElementById('applyFilter');

    let currentPage = 1;
    let currentQuery = '';
    let allGoods = [];
    let availableCategories = [];

    // --- Загрузка категорий ---
    async function loadCategories() {
        try {
            const data = await utils.apiRequest('/goods?per_page=100');
            const goods = data.goods || data;
            
            // Извлекаем уникальные категории
            const categories = [...new Set(goods.map(g => g.main_category))].sort();
            availableCategories = categories;
            
            const container = document.getElementById('categoryFilters');
            if (!container) return;
            
            container.innerHTML = '';
            
            categories.forEach(cat => {
                const label = document.createElement('label');
                label.innerHTML = `<input type="checkbox" value="${cat}" class="category-checkbox"> ${cat}`;
                container.appendChild(label);
            });
            
        } catch (error) {
            console.error('Ошибка загрузки категорий:', error);
            const container = document.getElementById('categoryFilters');
            if (container) {
                container.innerHTML = '<p style="color: red;">Ошибка загрузки категорий</p>';
            }
        }
    }

    // --- Загрузка товаров ---
    async function loadGoods(page = 1, reset = false) {
        try {
            const params = new URLSearchParams();
            params.append('page', page);
            params.append('per_page', 10);
            
            // Сортировка
            if (sortOrderSelect.value) {
                params.append('sort_order', sortOrderSelect.value);
            }

            // Поиск или фильтры
            if (currentQuery) {
                // Режим поиска
                params.append('query', currentQuery);
                console.log('Поиск:', currentQuery);
            } else {
                // Режим фильтрации
                const categoryCheckboxes = document.querySelectorAll('.category-checkbox:checked');
                const categories = Array.from(categoryCheckboxes).map(cb => cb.value);
                
                if (categories.length > 0) {
                    params.append('main_category', categories[0]);
                }
                
                const priceFrom = document.getElementById('priceFrom')?.value;
                const priceTo = document.getElementById('priceTo')?.value;
                
                if (priceFrom) params.append('price_from', priceFrom);
                if (priceTo) params.append('price_to', priceTo);
                
                if (document.getElementById('onlyDiscount')?.checked) {
                    params.append('discount', 1);
                }
            }

            const url = `/goods?${params.toString()}`;
            console.log('Запрос к API:', url);
            
            const data = await utils.apiRequest(url);
            
            // Обработка ответа
            const incomingGoods = data.goods || data;
            console.log('Получено товаров:', incomingGoods?.length || 0);

            if (reset) {
                goodsContainer.innerHTML = '';
                allGoods = incomingGoods || [];
            } else {
                allGoods = allGoods.concat(incomingGoods || []);
            }

            renderGoods(allGoods);
            currentPage = page;

            // Управление кнопкой "Загрузить ещё"
            if (!incomingGoods || incomingGoods.length < 10) {
                loadMoreBtn.style.display = 'none';
            } else {
                loadMoreBtn.style.display = 'block';
            }

        } catch (error) {
            console.error('Ошибка загрузки товаров:', error);
            goodsContainer.innerHTML = '<p style="padding: 2rem; text-align: center;">Ошибка загрузки товаров. Попробуйте позже.</p>';
            loadMoreBtn.style.display = 'none';
        }
    }

    // --- Отображение товаров ---
    function renderGoods(goods) {
        goodsContainer.innerHTML = '';
        
        if (!goods || goods.length === 0) {
            goodsContainer.innerHTML = '<p style="padding: 2rem; text-align: center; grid-column: 1/-1;">Нет товаров, соответствующих вашему запросу.</p>';
            return;
        }

        goods.forEach(good => {
            const card = document.createElement('div');
            card.className = 'good-card';
            
            // Форматирование цены
            const priceDisplay = good.discount_price 
                ? `<span class="discount">${good.discount_price} ₽</span> <span class="price original">${good.actual_price} ₽</span>` 
                : `<span class="price">${good.actual_price} ₽</span>`;
            
            // Обрезаем длинное название
            const shortName = good.name.length > 80 ? good.name.substring(0, 80) + '...' : good.name;
            
            card.innerHTML = `
                <img src="${good.image_url}" alt="${good.name}" onerror="this.src='https://via.placeholder.com/200x200?text=No+Image';">
                <div class="name" title="${good.name}">${shortName}</div>
                <div class="rating">⭐ ${good.rating}</div>
                <div class="price-block">${priceDisplay}</div>
                <button class="add-to-cart" data-id="${good.id}">Добавить в корзину</button>
            `;
            goodsContainer.appendChild(card);
        });

        // Навешиваем события на кнопки "Добавить в корзину"
        document.querySelectorAll('.add-to-cart').forEach(button => {
            button.addEventListener('click', (e) => {
                const goodId = parseInt(e.target.dataset.id, 10);
                utils.Cart.addItem(goodId);
            });
        });
    }

    // --- Автодополнение ---
    searchInput.addEventListener('input', debounce(async function() {
        const query = this.value.trim();
        
        if (query.length > 2) {
            try {
                const suggestions = await utils.apiRequest(`/autocomplete?query=${encodeURIComponent(query)}`);
                displayAutocomplete(suggestions);
            } catch (error) {
                console.error('Ошибка автодополнения:', error);
                autocompleteList.innerHTML = '';
                autocompleteList.classList.remove('show');
            }
        } else {
            autocompleteList.innerHTML = '';
            autocompleteList.classList.remove('show');
        }
    }, 300));

    function displayAutocomplete(suggestions) {
        autocompleteList.innerHTML = '';
        
        if (suggestions && suggestions.length > 0) {
            suggestions.forEach(suggestion => {
                const div = document.createElement('div');
                div.textContent = suggestion;
                div.addEventListener('click', () => {
                    // Заменяем последнее слово на выбранное
                    const words = searchInput.value.split(' ');
                    words[words.length - 1] = suggestion; 
                    searchInput.value = words.join(' '); 
                    
                    autocompleteList.innerHTML = '';
                    autocompleteList.classList.remove('show');
                });
                autocompleteList.appendChild(div);
            });
            autocompleteList.classList.add('show');
        } else {
            autocompleteList.classList.remove('show');
        }
    }

    // Закрытие автодополнения при клике вне его
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !autocompleteList.contains(e.target)) {
            autocompleteList.classList.remove('show');
        }
    });

    // --- Поиск ---
    searchBtn.addEventListener('click', function() {
        currentQuery = searchInput.value.trim();
        
        if (!currentQuery) {
            utils.showNotification('Введите поисковый запрос', 'info');
            return;
        }
        
        // Сбрасываем фильтры в UI
        document.querySelectorAll('.category-checkbox').forEach(cb => cb.checked = false);
        const priceFromInput = document.getElementById('priceFrom');
        const priceToInput = document.getElementById('priceTo');
        const discountCheckbox = document.getElementById('onlyDiscount');
        
        if (priceFromInput) priceFromInput.value = '';
        if (priceToInput) priceToInput.value = '';
        if (discountCheckbox) discountCheckbox.checked = false;
        
        console.log('Выполняем поиск:', currentQuery);
        loadGoods(1, true);
    });

    // Поиск по Enter
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchBtn.click();
        }
    });

    // --- Фильтрация ---
    applyFilterBtn.addEventListener('click', function() {
        // Сбрасываем поисковый запрос
        currentQuery = '';
        searchInput.value = '';
        autocompleteList.innerHTML = '';
        autocompleteList.classList.remove('show');
        
        console.log('Применяем фильтры');
        loadGoods(1, true);
    });

    // --- Сортировка ---
    sortOrderSelect.addEventListener('change', function() {
        console.log('Сортировка изменена на:', this.value);
        loadGoods(1, true);
    });

    // --- Пагинация ---
    loadMoreBtn.addEventListener('click', function() {
        console.log('Загрузка страницы:', currentPage + 1);
        loadGoods(currentPage + 1, false);
    });

    // --- Debounce функция ---
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    // --- Инициализация ---
    console.log('Инициализация main.js');
    loadCategories();
    loadGoods(1, true);
});
