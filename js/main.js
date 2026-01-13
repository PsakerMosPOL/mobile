// main.js - ПОЛНОСТЬЮ ИСПРАВЛЕННЫЙ

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
    let isLoading = false;
    let hasMore = true;

    // --- Загрузка товаров ---
    async function loadGoods(page = 1, reset = false) {
        if (isLoading) return;
        
        isLoading = true;
        loadMoreBtn.textContent = 'Загрузка...';
        loadMoreBtn.disabled = true;

        try {
            const params = new URLSearchParams();
            params.append('page', page);
            params.append('per_page', 10);
            
            // Сортировка
            if (sortOrderSelect.value) {
                params.append('sort_order', sortOrderSelect.value);
                console.log('Сортировка:', sortOrderSelect.value);
            }

            // Поиск или фильтры
            if (currentQuery) {
                params.append('query', currentQuery);
                console.log('Поиск по запросу:', currentQuery);
            } else {
                // Фильтрация по категориям
                const categories = document.querySelectorAll('.filter-category input[type="checkbox"]:checked');
                const categoryValues = Array.from(categories).map(cb => cb.value);
                
                if (categoryValues.length > 0) {
                    // API ожидает строку с категорией, берем первую
                    params.append('main_category', categoryValues[0]);
                    console.log('Категория:', categoryValues[0]);
                }
                
                // Фильтрация по цене
                const priceFrom = document.getElementById('priceFrom').value;
                const priceTo = document.getElementById('priceTo').value;
                
                if (priceFrom) {
                    params.append('price_from', priceFrom);
                    console.log('Цена от:', priceFrom);
                }
                if (priceTo) {
                    params.append('price_to', priceTo);
                    console.log('Цена до:', priceTo);
                }
                
                // Только со скидкой
                if (document.getElementById('onlyDiscount').checked) {
                    params.append('discount', 'true');
                    console.log('Только со скидкой: да');
                }
            }

            const url = `/goods?${params.toString()}`;
            console.log('Полный URL запроса:', url);
            
            const data = await utils.apiRequest(url);
            console.log('Ответ от API:', data);
            
            // Проверяем структуру ответа
            let incomingGoods = [];
            if (Array.isArray(data)) {
                incomingGoods = data;
            } else if (data && data.goods && Array.isArray(data.goods)) {
                incomingGoods = data.goods;
            } else if (data && Array.isArray(data.items)) {
                incomingGoods = data.items;
            }
            
            console.log(`Получено ${incomingGoods.length} товаров`);

            if (reset) {
                goodsContainer.innerHTML = '';
            }

            if (incomingGoods.length === 0) {
                if (reset) {
                    goodsContainer.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 2rem;">Товары не найдены</p>';
                }
                hasMore = false;
            } else {
                renderGoods(incomingGoods, !reset);
                hasMore = incomingGoods.length >= 10;
            }

            currentPage = page;
            
            // Обновляем состояние кнопки
            if (hasMore) {
                loadMoreBtn.textContent = 'Загрузить ещё';
                loadMoreBtn.style.display = 'block';
            } else {
                loadMoreBtn.style.display = 'none';
            }

        } catch (error) {
            console.error('Ошибка загрузки товаров:', error);
            if (reset) {
                goodsContainer.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #dc3545;">Ошибка загрузки товаров</p>';
            }
            hasMore = false;
            loadMoreBtn.style.display = 'none';
        } finally {
            isLoading = false;
            loadMoreBtn.disabled = false;
            loadMoreBtn.textContent = 'Загрузить ещё';
        }
    }

    // --- Отображение товаров ---
    function renderGoods(goods, append = false) {
        if (!append) {
            goodsContainer.innerHTML = '';
        }

        goods.forEach(good => {
            const card = document.createElement('div');
            card.className = 'good-card';
            
            // Проверяем наличие данных
            const name = good.name || 'Без названия';
            const rating = good.rating || 0;
            const actualPrice = good.actual_price || good.price || 0;
            const discountPrice = good.discount_price;
            const imageUrl = good.image_url || 'assets/placeholder.png';
            const id = good.id || good._id || Date.now();
            
            // Форматирование цены
            let priceDisplay = '';
            if (discountPrice && discountPrice < actualPrice) {
                priceDisplay = `
                    <div class="price-block">
                        <span class="discount">${discountPrice} ₽</span>
                        <span class="price original">${actualPrice} ₽</span>
                    </div>
                `;
            } else {
                priceDisplay = `
                    <div class="price-block">
                        <span class="price">${actualPrice} ₽</span>
                    </div>
                `;
            }
            
            card.innerHTML = `
                <img src="${imageUrl}" alt="${name}" onerror="this.onerror=null; this.src='assets/placeholder.png';">
                <div class="name" title="${name}">${name}</div>
                <div class="rating">⭐ ${rating.toFixed(1)}</div>
                ${priceDisplay}
                <button class="add-to-cart" data-id="${id}">Добавить в корзину</button>
            `;
            goodsContainer.appendChild(card);
        });

        // Навешиваем события на кнопки
        document.querySelectorAll('.add-to-cart').forEach(button => {
            button.addEventListener('click', (e) => {
                const goodId = e.target.dataset.id;
                utils.Cart.addItem(goodId);
            });
        });
    }

    // --- Автодополнение ---
    searchInput.addEventListener('input', debounce(async function() {
        const query = this.value.trim();
        if (query.length > 1) {
            try {
                const suggestions = await utils.apiRequest(`/autocomplete?query=${encodeURIComponent(query)}`);
                displayAutocomplete(suggestions);
            } catch (error) {
                console.log('Автодополнение не доступно');
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
                    searchInput.value = suggestion;
                    autocompleteList.innerHTML = '';
                    autocompleteList.classList.remove('show');
                    // Автоматически запускаем поиск при выборе
                    searchBtn.click();
                });
                autocompleteList.appendChild(div);
            });
            autocompleteList.classList.add('show');
        } else {
            autocompleteList.classList.remove('show');
        }
    }

    // Закрытие автодополнения
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !autocompleteList.contains(e.target)) {
            autocompleteList.classList.remove('show');
        }
    });

    // --- Поиск ---
    searchBtn.addEventListener('click', function() {
        const query = searchInput.value.trim();
        if (!query) {
            utils.showNotification('Введите поисковый запрос', 'info');
            return;
        }
        
        currentQuery = query;
        // Сбрасываем фильтры в UI
        document.querySelectorAll('.filter-category input[type="checkbox"]').forEach(cb => cb.checked = false);
        document.getElementById('priceFrom').value = '';
        document.getElementById('priceTo').value = '';
        document.getElementById('onlyDiscount').checked = false;
        
        console.log('Запускаем поиск:', currentQuery);
        loadGoods(1, true);
    });

    // Поиск по нажатию Enter
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchBtn.click();
        }
    });

    // --- Фильтрация ---
    applyFilterBtn.addEventListener('click', function() {
        // Сбрасываем поиск
        currentQuery = '';
        searchInput.value = '';
        autocompleteList.innerHTML = '';
        autocompleteList.classList.remove('show');
        
        console.log('Применяем фильтры');
        loadGoods(1, true);
    });

    // --- Сортировка ---
    sortOrderSelect.addEventListener('change', function() {
        console.log('Применяем сортировку:', this.value);
        loadGoods(1, true);
    });

    // --- Загрузка ещё ---
    loadMoreBtn.addEventListener('click', function() {
        if (!isLoading && hasMore) {
            loadGoods(currentPage + 1, false);
        }
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

    // --- Инициализация ---
    loadGoods(1, true);
    
    // Автофокус на поле поиска
    searchInput.focus();
});
