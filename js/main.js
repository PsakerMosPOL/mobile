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

            // ВАЖНО: Используем либо поиск, либо фильтры
            if (currentQuery) {
                // Если есть поисковый запрос, добавляем его
                params.append('query', currentQuery);
                console.log('Поисковый запрос:', currentQuery);
            } else {
                // Если поиска нет, применяем фильтры
                // Здесь читаем значения напрямую из DOM при каждом запросе
                // Это лучше, чем хранить в currentFilters
                const categoryCheckboxes = document.querySelectorAll('.filter-category input[type="checkbox"]:checked');
                const categories = Array.from(categoryCheckboxes).map(cb => cb.value);
                
                if (categories.length > 0) {
                    // Берем первую выбранную категорию
                    params.append('main_category', categories[0]);
                }
                
                const priceFrom = document.getElementById('priceFrom').value;
                const priceTo = document.getElementById('priceTo').value;
                if (priceFrom) params.append('price_from', priceFrom);
                if (priceTo) params.append('price_to', priceTo);
                
                if (document.getElementById('onlyDiscount').checked) {
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
        if (!goods || goods.length === 0) {
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

    // --- Автодополнение ---
    searchInput.addEventListener('input', debounce(async function() {
        const query = this.value.trim();
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
        if (!currentQuery) return;
        
        // Сбрасываем фильтры в UI
        document.querySelectorAll('.filter-category input[type="checkbox"]').forEach(cb => cb.checked = false);
        document.getElementById('priceFrom').value = '';
        document.getElementById('priceTo').value = '';
        document.getElementById('onlyDiscount').checked = false;
        
        console.log('Выполняем поиск:', currentQuery);
        loadGoods(1, true);
    });

    // --- Фильтрация (сайдбар) ---
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
