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

    // --- ДОБАВЛЕНО: Загрузка категорий ---
    async function loadCategories() {
        try {
            console.log('Загрузка категорий...');
            const data = await utils.apiRequest('/goods?per_page=100');
            const goods = data.goods || data;
            
            // Извлекаем уникальные категории
            const categories = [...new Set(goods.map(g => g.main_category))].filter(Boolean).sort();
            
            const container = document.getElementById('categoryFilters');
            if (!container) {
                console.error('❌ Элемент #categoryFilters не найден в HTML!');
                return;
            }
            
            container.innerHTML = ''; // Очищаем "Загрузка..."
            
            if (categories.length === 0) {
                container.innerHTML = '<p style="color: #999;">Категории не найдены</p>';
                return;
            }
            
            categories.forEach(cat => {
                const label = document.createElement('label');
                label.style.display = 'block';
                label.style.marginBottom = '0.5rem';
                label.innerHTML = `<input type="checkbox" value="${cat}" class="category-checkbox"> ${cat}`;
                container.appendChild(label);
            });
            
            console.log(`✅ Загружено ${categories.length} категорий:`, categories);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки категорий:', error);
            const container = document.getElementById('categoryFilters');
            if (container) {
                container.innerHTML = '<p style="color: red; font-size: 0.9rem;">Ошибка загрузки категорий</p>';
            }
        }
    }

    // --- Загрузка товаров ---
    async function loadGoods(page = 1, reset = false) {
        if (isLoading) return;
        
        isLoading = true;
        if (loadMoreBtn) {
            loadMoreBtn.textContent = 'Загрузка...';
            loadMoreBtn.disabled = true;
        }

        try {
            const params = new URLSearchParams();
            params.append('page', page);
            params.append('per_page', 10);
            
            // Сортировка
            if (sortOrderSelect && sortOrderSelect.value) {
                params.append('sort_order', sortOrderSelect.value);
                console.log('Сортировка:', sortOrderSelect.value);
            }

            // Поиск или фильтры
            if (currentQuery) {
                params.append('query', currentQuery);
                console.log('Поиск по запросу:', currentQuery);
            } else {
                // Фильтрация по категориям
                const categories = document.querySelectorAll('.category-checkbox:checked');
                const categoryValues = Array.from(categories).map(cb => cb.value);
                
                if (categoryValues.length > 0) {
                    params.append('main_category', categoryValues[0]);
                    console.log('Категория:', categoryValues[0]);
                }
                
                // Фильтрация по цене
                const priceFrom = document.getElementById('priceFrom')?.value;
                const priceTo = document.getElementById('priceTo')?.value;
                
                if (priceFrom) {
                    params.append('price_from', priceFrom);
                    console.log('Цена от:', priceFrom);
                }
                if (priceTo) {
                    params.append('price_to', priceTo);
                    console.log('Цена до:', priceTo);
                }
                
                // Только со скидкой
                const discountCheckbox = document.getElementById('onlyDiscount');
                if (discountCheckbox && discountCheckbox.checked) {
                    params.append('discount', '1');
                    console.log('Только со скидкой: да');
                }
            }

            const url = `/goods?${params.toString()}`;
            console.log('📡 Запрос к API:', url);
            
            const data = await utils.apiRequest(url);
            
            // Проверяем структуру ответа
            let incomingGoods = [];
            if (Array.isArray(data)) {
                incomingGoods = data;
            } else if (data && data.goods && Array.isArray(data.goods)) {
                incomingGoods = data.goods;
            }
            
            console.log(`✅ Получено ${incomingGoods.length} товаров`);

            if (reset) {
                goodsContainer.innerHTML = '';
            }

            if (incomingGoods.length === 0) {
                if (reset) {
                    goodsContainer.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #666;">Товары не найдены</p>';
                }
                hasMore = false;
            } else {
                renderGoods(incomingGoods, !reset);
                hasMore = incomingGoods.length >= 10;
            }

            currentPage = page;
            
            // Обновляем состояние кнопки
            if (loadMoreBtn) {
                if (hasMore) {
                    loadMoreBtn.textContent = 'Загрузить ещё';
                    loadMoreBtn.style.display = 'block';
                } else {
                    loadMoreBtn.style.display = 'none';
                }
            }

        } catch (error) {
            console.error('❌ Ошибка загрузки товаров:', error);
            if (reset) {
                goodsContainer.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #dc3545;">Ошибка загрузки товаров. Попробуйте позже.</p>';
            }
            hasMore = false;
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        } finally {
            isLoading = false;
            if (loadMoreBtn) {
                loadMoreBtn.disabled = false;
                loadMoreBtn.textContent = 'Загрузить ещё';
            }
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
            
            const name = good.name || 'Без названия';
            const rating = good.rating || 0;
            const actualPrice = good.actual_price || 0;
            const discountPrice = good.discount_price;
            const imageUrl = good.image_url || 'https://via.placeholder.com/200x200?text=No+Image';
            const id = good.id || Date.now();
            
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
            
            // Обрезаем длинные названия
            const shortName = name.length > 60 ? name.substring(0, 60) + '...' : name;
            
            card.innerHTML = `
                <img src="${imageUrl}" alt="${name}" onerror="this.onerror=null; this.src='https://via.placeholder.com/200x200?text=No+Image';">
                <div class="name" title="${name}">${shortName}</div>
                <div class="rating">⭐ ${rating.toFixed(1)}</div>
                ${priceDisplay}
                <button class="add-to-cart" data-id="${id}">Добавить в корзину</button>
            `;
            goodsContainer.appendChild(card);
        });

        // Навешиваем события на кнопки
        document.querySelectorAll('.add-to-cart').forEach(button => {
            button.addEventListener('click', (e) => {
                const goodId = parseInt(e.target.dataset.id, 10);
                utils.Cart.addItem(goodId);
            });
        });
    }

    // --- Автодополнение ---
    if (searchInput && autocompleteList) {
        searchInput.addEventListener('input', debounce(async function() {
            const query = this.value.trim();
            if (query.length > 2) {
                try {
                    const suggestions = await utils.apiRequest(`/autocomplete?query=${encodeURIComponent(query)}`);
                    displayAutocomplete(suggestions);
                } catch (error) {
                    console.log('Автодополнение недоступно');
                    autocompleteList.innerHTML = '';
                    autocompleteList.classList.remove('show');
                }
            } else {
                autocompleteList.innerHTML = '';
                autocompleteList.classList.remove('show');
            }
        }, 300));
    }

    function displayAutocomplete(suggestions) {
        if (!autocompleteList) return;
        
        autocompleteList.innerHTML = '';
        if (suggestions && suggestions.length > 0) {
            suggestions.forEach(suggestion => {
                const div = document.createElement('div');
                div.textContent = suggestion;
                div.addEventListener('click', () => {
                    searchInput.value = suggestion;
                    autocompleteList.innerHTML = '';
                    autocompleteList.classList.remove('show');
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
        if (autocompleteList && !searchInput.contains(e.target) && !autocompleteList.contains(e.target)) {
            autocompleteList.classList.remove('show');
        }
    });

    // --- Поиск ---
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            const query = searchInput.value.trim();
            if (!query) {
                utils.showNotification('Введите поисковый запрос', 'info');
                return;
            }
            
            currentQuery = query;
            // Сбрасываем фильтры
            document.querySelectorAll('.category-checkbox').forEach(cb => cb.checked = false);
            const priceFrom = document.getElementById('priceFrom');
            const priceTo = document.getElementById('priceTo');
            const discountCheckbox = document.getElementById('onlyDiscount');
            
            if (priceFrom) priceFrom.value = '';
            if (priceTo) priceTo.value = '';
            if (discountCheckbox) discountCheckbox.checked = false;
            
            console.log('🔍 Поиск:', currentQuery);
            loadGoods(1, true);
        });
    }

    // Поиск по Enter
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchBtn.click();
            }
        });
    }

    // --- Фильтрация ---
if (applyFilterBtn) {
    applyFilterBtn.addEventListener('click', function() {
        if (isLoading) return; // Защита от двойного клика
        
        currentQuery = '';
        if (searchInput) searchInput.value = '';
        if (autocompleteList) {
            autocompleteList.innerHTML = '';
            autocompleteList.classList.remove('show');
        }
        
        console.log('🔧 Применяем фильтры');
        
        // Временно блокируем кнопку
        applyFilterBtn.disabled = true;
        applyFilterBtn.textContent = 'Загрузка...';
        
        loadGoods(1, true).finally(() => {
            applyFilterBtn.disabled = false;
            applyFilterBtn.textContent = 'Применить';
        });
    });
}


    // --- Сортировка ---
    if (sortOrderSelect) {
        sortOrderSelect.addEventListener('change', function() {
            console.log('🔄 Сортировка:', this.value);
            loadGoods(1, true);
        });
    }

    // --- Загрузка ещё ---
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function() {
            if (!isLoading && hasMore) {
                loadGoods(currentPage + 1, false);
            }
        });
    }

    // --- Функция Debounce ---
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    // --- ИНИЦИАЛИЗАЦИЯ (ВАЖНО!) ---
    console.log('🚀 Инициализация main.js');
    loadCategories();
    loadGoods(1, true);
}); // <-- ЗАКРЫВАЮЩАЯ СКОБКА ОБЯЗАТЕЛЬНА!

