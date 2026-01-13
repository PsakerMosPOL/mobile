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
                <img src="${imageUrl}" alt="${name}" onerror="th
