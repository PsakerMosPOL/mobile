// main.js - ИСПРАВЛЕННАЯ ВЕРСИЯ

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
    let currentFilters = {
        category: null,
        priceFrom: null,
        priceTo: null,
        discount: false
    };
    let allGoods = [];

    // --- Загрузка товаров ---
    async function loadGoods(page = 1, reset = false) {
        try {
            const params = new URLSearchParams();
            params.append('page', page);
            params.append('per_page', 10);
            
            // Сортировка должна применяться всегда, если выбрана
            if (sortOrderSelect.value) {
                params.append('sort_order', sortOrderSelect.value);
            }

            // ВАЖНО: Используем либо поиск, либо фильтры, но не одновременно
            if (currentQuery) {
                // Если есть поисковый запрос, добавляем его
                params.append('query', currentQuery);
                console.log('Поисковый запрос:', currentQuery);
            } else {
                // Если поиска нет, применяем фильтры из currentFilters
                if (currentFilters.category) {
                    params.append('main_category', currentFilters.category);
                }
                if (currentFilters.priceFrom) {
                    params.append('price_from', currentFilters.priceFrom);
                }
                if (currentFilters.priceTo) {
                    params.append('price_to', currentFilters.priceTo);
                }
                if (currentFilters.discount) {
                    params.append('discount', 1);
                }
                console.log('Фильтры:', currentFilters);
            }

            const url = `/goods?${params.toString()}`;
            console.log('Запрос к API:', url);
            
            const data = await utils.apiRequest(url);
            
            // Обработка ответа
            const incomingGoods = data.goods || data;
            console.log('Получено товаров:', incomingGoods.length);

            if (reset) {
                goodsContainer.innerHTML = '';
                allGoods = incomingGoods;
            } else {
                allGoods = allGoods.concat(incomingGoods);
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
            utils.showNotification('Ошибка загрузки товаров', 'error');
        }
    }

    // --- Отображение товаров ---
    function renderGoods(goods) {
        goodsContainer.innerHTML = '';
        if (goods.length === 0) {
            goodsContainer.innerHTML = '<p>Нет товаров, соответствующих вашему запросу.</p>';
            return;
        }

        goods.forEach(good => {
            const card = document.createElement('div');
            card.className = 'good-card';
            
            // Форматирование цены
            const priceDisplay = good.discount_price 
                ? `<span class="discount">${good.discount_price} ₽</span><span class="price original">${good.actual_price} ₽</span>` 
                : `<span class="price">${good.actual_price} ₽</span>`;
            
            card.innerHTML = `
                <img src="${good.image_url}" alt="${good.name}" onerror="this.src='assets/placeholder.png';">
                <div class="name" title="${good.name}">${good.name}</div>
                <div class="rating">⭐ ${good.rating}</div>
                <div class="price-block">${priceDisplay}</div>
                <button class="add-to-cart" data-id="${good.id}">Добавить в корзину</button>
            `;
            goodsContainer.appendChild(card);
        });

        // Навешиваем события на новые кнопки
        document.querySelectorAll('.add-to-cart').forEach(button => {
            button.addEventListener('click', (e) => {
                const goodId = parseInt(e.target.dataset.id, 10);
                utils.Cart.addItem(goodId);
            });
        });
    }

    // --- Автодополнение (Вариант 1) ---
    searchInput.addEventListener('input', debounce(async function() {
        const query = this.value.trim();
        // Запрос отправляем, только если введено хотя бы 2-3 символа
        if (query.length > 2) {
            try {
                const suggestions = await utils.apiRequest(`/autocomplete?query=${encodeURIComponent(query)}`);
                displayAutocomplete(suggestions);
            } catch (error) {
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
        // Сбрасываем фильтры при поиске
        currentFilters = {
            category: null,
            priceFrom: null,
            priceTo: null,
            discount: false
        };
        // Сбрасываем чекбоксы в сайдбаре
        document.querySelectorAll('.filter-category input[type="checkbox"]').forEach(cb => cb.checked = false);
        document.getElementById('priceFrom').value = '';
        document.getElementById('priceTo').value = '';
        document.getElementById('onlyDiscount').checked = false;
        
        loadGoods(1, true);
    });

    // --- Фильтрация (сайдбар) ---
    applyFilterBtn.addEventListener('click', function() {
        // Собираем категории (берем первую выбранную)
        const categories = document.querySelectorAll('.filter-category input[type="checkbox"]:checked');
        const categoryValues = Array.from(categories).map(cb => cb.value);
        
        currentFilters.category = categoryValues[0] || null;
        currentFilters.priceFrom = document.getElementById('priceFrom').value || null;
        currentFilters.priceTo = document.getElementById('priceTo').value || null;
        currentFilters.discount = document.getElementById('onlyDiscount').checked;
        
        // Сбрасываем поисковый запрос
        currentQuery = '';
        searchInput.value = '';
        autocompleteList.innerHTML = '';
        autocompleteList.classList.remove('show');
        
        console.log('Применены фильтры:', currentFilters);
        loadGoods(1, true);
    });

    // --- Сортировка ---
    sortOrderSelect.addEventListener('change', function() {
        console.log('Сортировка изменена на:', this.value);
        loadGoods(1, true);
    });

    // --- Загрузка ещё (пагинация) ---
    loadMoreBtn.addEventListener('click', function() {
        loadGoods(currentPage + 1, false);
    });

    // --- Функция Debounce ---
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    // --- Инициализация: Первая загрузка ---
    loadGoods(1, true);
});
