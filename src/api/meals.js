import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL, callWithAutoRefresh } from './auth';

/**
 * Chuyển đổi tiếng Việt có dấu thành không dấu để tìm kiếm
 * @param {string} str - Chuỗi tiếng Việt có dấu
 * @returns {string} Chuỗi tiếng Việt không dấu
 */
function removeVietnameseTones(str) {
  if (!str) return '';
  
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  str = str.replace(/đ/g, 'd');
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, 'A');
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, 'E');
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, 'I');
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, 'O');
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, 'U');
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, 'Y');
  str = str.replace(/Đ/g, 'D');
  
  return str;
}

// Hàm lấy token để gửi request có authentication (nếu cần)
async function getAuthHeaders() {
  const token = await AsyncStorage.getItem('accessToken');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Hàm xử lý response JSON
async function handleJson(response) {
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (parseError) {
    console.error('[handleJson] JSON parse error:', parseError, 'Response text:', text?.substring(0, 200));
    data = null;
  }
  if (!response.ok) {
    const message = (data && (data.message || data.error)) || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return data;
}

/**
 * Chuyển đổi meal từ backend format sang frontend format
 * @param {Object} meal - Meal object từ backend
 * @returns {Object} Meal object cho frontend
 */
function transformMealFromBackend(meal) {
  // Extract ingredient names từ array ingredients
  // Backend có thể trả về ingredients là array string hoặc array object
  const ingredientNames = (meal.ingredients || []).map(ing => {
    if (typeof ing === 'string') return ing;
    return ing?.name || '';
  }).filter(Boolean);
  
  // Tạo description từ ingredients hoặc dùng description từ backend
  const desc = meal.description || ingredientNames.join(', ');
  
  // Ước tính thời gian nấu từ số lượng instructions (giả định mỗi bước ~5 phút)
  const estimatedTime = meal.instructions?.length 
    ? `${Math.max(5, meal.instructions.length * 3)} phút`
    : '15 phút';

  return {
    id: meal._id || meal.id,
    title: meal.name || meal.title || 'Món ăn', // Backend trả về 'name'
    desc: desc,
    time: estimatedTime,
    mealIngredients: ingredientNames, // Lưu danh sách tên nguyên liệu để filter
    instructions: meal.instructions || [],
    image: meal.image || 'https://via.placeholder.com/150',
    category: meal.category || null,
    subCategory: meal.subCategory || null,
    dietType: meal.dietType || null,
    totalKcal: meal.totalKcal || meal.totalCalories || 0,
    tag: meal.tag || [], // Tags từ backend (dùng để tìm kiếm nguyên liệu)
    mealTime: meal.mealTime || [], // Array: ['breakfast', 'lunch', 'dinner']
    rating: meal.rating || 0,
    reviews: meal.reviews || [],
  };
}

/**
 * Lấy tất cả meals từ backend (với pagination)
 * @param {Object} params - Tham số
 * @param {number} params.page - Số trang (mặc định 1)
 * @param {number} params.limit - Số items mỗi trang (mặc định 50)
 * @returns {Promise<Object>} Response với data và pagination
 */
export async function getAllMeals({ page = 1, limit = 50 } = {}) {
  try {
    const headers = await getAuthHeaders();
    
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());

    const url = `${BASE_URL}/meal/getallmeal${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    console.log(`[getAllMeals] Fetching: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: headers,
    });

    console.log(`[getAllMeals] Response status: ${response.status}`);

    if (!response.ok) {
      // Nếu là lỗi 401, có thể token hết hạn
      if (response.status === 401) {
        console.error('[getAllMeals] 401 Unauthorized - Token might be expired');
        throw new Error('401 Unauthorized');
      }
      const errorText = await response.text();
      console.error(`[getAllMeals] HTTP ${response.status} error:`, errorText);
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await handleJson(response);
    
    console.log(`[getAllMeals] Response structure:`, {
      hasData: !!result?.data,
      dataIsArray: Array.isArray(result?.data),
      dataHasItems: !!result?.data?.items,
      itemsLength: result?.data?.items?.length || 0,
      hasPagination: !!result?.pagination || !!result?.data?.pagination,
    });
    
    // Đảm bảo result có cấu trúc đúng
    if (!result) {
      console.warn('[getAllMeals] Empty response from API');
      return { data: [], pagination: { hasNextPage: false } };
    }
    
    // API trả về data.items (array) thay vì data (array) trực tiếp
    let mealsArray = [];
    if (result.data) {
      // Nếu data là array trực tiếp
      if (Array.isArray(result.data)) {
        mealsArray = result.data;
      }
      // Nếu data có items bên trong (structure: {data: {items: [...], pagination: {...}}})
      else if (result.data.items && Array.isArray(result.data.items)) {
        mealsArray = result.data.items;
      }
      // Nếu data là object nhưng không có items
      else {
        console.warn('[getAllMeals] Unexpected data structure:', result.data);
        mealsArray = [];
      }
    }
    
    // Transform data từ backend format sang frontend format
    if (mealsArray.length > 0) {
      const transformedData = mealsArray.map(meal => {
        try {
          return transformMealFromBackend(meal);
        } catch (transformError) {
          console.error('[getAllMeals] Error transforming meal:', transformError, meal);
          return null;
        }
      }).filter(meal => meal !== null); // Loại bỏ meals transform lỗi
      
      console.log(`[getAllMeals] Transformed ${transformedData.length} meals from ${mealsArray.length} raw meals`);
      result.data = transformedData;
    } else {
      console.warn('[getAllMeals] No meals found in response');
      result.data = [];
    }
    
    // Lấy pagination từ result.data.pagination hoặc result.pagination
    if (result.data && result.data.pagination) {
      // Pagination nằm trong data object
      result.pagination = {
        hasNextPage: result.data.pagination.has_next_page || result.data.pagination.hasNextPage || false,
        hasPrevPage: result.data.pagination.has_prev_page || result.data.pagination.hasPrevPage || false,
        currentPage: result.data.pagination.current_page || result.data.pagination.currentPage || 1,
        totalPages: result.data.pagination.total_pages || result.data.pagination.totalPages || 1,
        totalItems: result.data.pagination.total_items || result.data.pagination.totalItems || 0,
      };
    } else if (!result.pagination) {
      // Nếu không có pagination, tạo default
      result.pagination = { hasNextPage: false };
    } else {
      // Normalize pagination từ root level
      result.pagination = {
        hasNextPage: result.pagination.has_next_page || result.pagination.hasNextPage || false,
        hasPrevPage: result.pagination.has_prev_page || result.pagination.hasPrevPage || false,
        currentPage: result.pagination.current_page || result.pagination.currentPage || 1,
        totalPages: result.pagination.total_pages || result.pagination.totalPages || 1,
        totalItems: result.pagination.total_items || result.pagination.totalItems || 0,
      };
    }
    
    return result;
  } catch (error) {
    console.error('[getAllMeals] Error:', error.message, error);
    throw error;
  }
}

/**
 * Lấy chi tiết món ăn theo id
 * @param {string} id - ID của meal
 * @returns {Promise<Object>} Meal object đã transform
 */
export async function getMealById(id) {
  try {
    const headers = await getAuthHeaders();
    const url = `${BASE_URL}/meal/getmealbyid/${id}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: headers,
    });

    if (response.status === 404) {
      throw new Error('Meal not found');
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await handleJson(response);
    
    // Transform data từ backend format sang frontend format
    if (result.data) {
      return transformMealFromBackend(result.data);
    }
    
    return null;
  } catch (error) {
    console.error('Error getting meal by id:', error.message);
    throw error;
  }
}

/**
 * Tìm kiếm meals trong database dựa trên tên món ăn và tag (nguyên liệu)
 * @param {Object} params - Tham số tìm kiếm
 * @param {string} params.searchText - Từ khóa tìm kiếm (tên món ăn)
 * @param {Array<string>} params.ingredients - Mảng các nguyên liệu được chọn từ tags
 * @returns {Promise<Array>} Danh sách meals tìm được (đã transform và sắp xếp theo mealTime)
 */
export async function searchMeals({ searchText = '', ingredients = [] }) {
  try {
    const headers = await getAuthHeaders();
    
    // Lấy tất cả meals từ backend và filter ở client side
    // Vì backend chưa có endpoint search, ta sẽ filter theo tên và tag
    let allMeals = [];
    let currentPage = 1;
    const limit = 50;
    let hasMore = true;
    
    // Lấy tất cả meals với pagination
    console.log('[searchMeals] Starting to fetch meals from API...');
    while (hasMore && allMeals.length < 200) {
      try {
        console.log(`[searchMeals] Fetching page ${currentPage}...`);
        const result = await getAllMeals({ page: currentPage, limit });
        
        if (result && result.data && Array.isArray(result.data)) {
          // getAllMeals đã transform data rồi, không cần transform lại
          allMeals = [...allMeals, ...result.data];
          console.log(`[searchMeals] Page ${currentPage}: Got ${result.data.length} meals, total: ${allMeals.length}`);
          hasMore = result.pagination?.hasNextPage || false;
          currentPage++;
          
          // Nếu trang này không có data, dừng lại
          if (result.data.length === 0) {
            console.log('[searchMeals] No more meals in this page, stopping');
            hasMore = false;
          }
        } else {
          console.warn(`[searchMeals] Invalid result structure on page ${currentPage}:`, result);
          hasMore = false;
        }
      } catch (error) {
        console.error(`[searchMeals] Error fetching meals page ${currentPage}:`, error.message);
        // Nếu lỗi ở trang đầu, có thể API không hoạt động
        if (currentPage === 1) {
          console.warn('[searchMeals] API might be unavailable on first page, using mock data');
          return getMockMeals({ searchText, ingredients });
        }
        // Nếu lỗi ở trang sau, có thể đã hết data
        console.log('[searchMeals] Stopping pagination due to error');
        hasMore = false;
      }
    }
    
    console.log(`[searchMeals] Finished fetching. Total meals: ${allMeals.length}`);
    
    // Nếu không có data từ backend, dùng mock data
    if (allMeals.length === 0) {
      console.warn('[searchMeals] No meals from API, using mock data');
      return getMockMeals({ searchText, ingredients });
    }

    // Filter theo searchText - tìm kiếm theo chữ cái đầu và prefix của tên món ăn
    if (searchText && searchText.trim()) {
      const searchLower = searchText.toLowerCase().trim();
      const searchWithoutTones = removeVietnameseTones(searchLower);
      const searchTerms = searchLower.split(/\s+/).filter(term => term.length > 0);
      const searchTermsWithoutTones = searchWithoutTones.split(/\s+/).filter(term => term.length > 0);
      
      // Thêm điểm ưu tiên cho mỗi meal để sắp xếp kết quả
      const mealsWithScore = allMeals.map(meal => {
        const mealTitle = meal.title || meal.name || '';
        // Loại bỏ ký tự đặc biệt và format lại title
        const titleCleaned = mealTitle.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        const titleLower = titleCleaned.toLowerCase();
        const titleWithoutTones = removeVietnameseTones(titleLower);
        
        // Tách title thành các từ riêng biệt
        const titleWords = titleLower.split(/\s+/).filter(w => w.length > 0);
        const titleWordsWithoutTones = titleWithoutTones.split(/\s+/).filter(w => w.length > 0);
        
        let score = 0; // Điểm ưu tiên (cao hơn = ưu tiên hơn)
        let matches = false;
        
        // Tìm kiếm theo prefix (chữ cái đầu) của từng từ trong tên món
        if (searchTerms.length === 1) {
          const searchTerm = searchTerms[0];
          const searchTermWithoutTones = searchTermsWithoutTones[0];
          
          // Nếu searchTerm ngắn (1-2 ký tự), chỉ match từ đầu tiên để tránh kết quả không chính xác
          const isShortSearch = searchTerm.length <= 2;
          
          if (isShortSearch) {
            // Chỉ match từ đầu tiên của title (chữ cái đầu)
            if (titleWords[0] && titleWords[0].startsWith(searchTerm)) {
              score = 100;
              matches = true;
            } else if (titleWordsWithoutTones[0] && titleWordsWithoutTones[0].startsWith(searchTermWithoutTones)) {
              score = 95;
              matches = true;
            }
            // Không match contains cho short search để tránh kết quả sai (ví dụ: "c" không match "bánh mì")
          } else {
            // Search term dài hơn (>= 3 ký tự): match từ đầu tiên (ưu tiên cao nhất)
            if (titleWords[0] && titleWords[0].startsWith(searchTerm)) {
              score = 100;
              matches = true;
            } else if (titleWordsWithoutTones[0] && titleWordsWithoutTones[0].startsWith(searchTermWithoutTones)) {
              score = 95;
              matches = true;
            }
            // Match từ bất kỳ trong title (ưu tiên thấp hơn)
            else if (titleWords.some(word => word.startsWith(searchTerm))) {
              score = 80;
              matches = true;
            } else if (titleWordsWithoutTones.some(word => word.startsWith(searchTermWithoutTones))) {
              score = 75;
              matches = true;
            }
            // Match contains chỉ khi search term đủ dài (>= 3 ký tự)
            else if (titleLower.includes(searchTerm)) {
              score = 50;
              matches = true;
            } else if (titleWithoutTones.includes(searchTermWithoutTones)) {
              score = 45;
              matches = true;
            }
          }
        } else {
          // Nhiều từ: kiểm tra tất cả các từ phải match
          let allMatch = true;
          let prefixMatchCount = 0;
          
          for (let i = 0; i < searchTerms.length; i++) {
            const term = searchTerms[i];
            const termWithoutTones = searchTermsWithoutTones[i];
            
            // Kiểm tra prefix match
            const prefixMatch = titleWords.some(word => word.startsWith(term)) ||
                               titleWordsWithoutTones.some(word => word.startsWith(termWithoutTones));
            
            // Kiểm tra contains match
            const containsMatch = titleLower.includes(term) ||
                                 titleWithoutTones.includes(termWithoutTones);
            
            if (prefixMatch) {
              prefixMatchCount++;
            } else if (!containsMatch) {
              allMatch = false;
              break;
            }
          }
          
          if (allMatch) {
            matches = true;
            // Điểm dựa trên số lượng prefix matches
            score = 60 + (prefixMatchCount * 10);
          }
        }
        
        return { meal, score, matches };
      });
      
      // Lọc chỉ những meals match và sắp xếp theo điểm ưu tiên
      allMeals = mealsWithScore
        .filter(item => item.matches)
        .sort((a, b) => b.score - a.score) // Sắp xếp giảm dần theo điểm
        .map(item => item.meal);
    }

    // Filter theo ingredients (tags) - tìm trong tag array của meal
    if (ingredients && ingredients.length > 0) {
      allMeals = allMeals.filter(meal => {
        // Lấy tags từ meal (có thể là tag hoặc mealIngredients)
        const mealTags = (meal.tag || []).map(tag => tag.toLowerCase());
        const mealIngs = (meal.mealIngredients || []).map(ing => ing.toLowerCase());
        const allTags = [...mealTags, ...mealIngs];
        const allTagsWithoutTones = allTags.map(tag => removeVietnameseTones(tag));
        
        // Kiểm tra nếu ít nhất một nguyên liệu được chọn có trong tags
        return ingredients.some(selectedIng => {
          const selectedLower = selectedIng.toLowerCase();
          const selectedWithoutTones = removeVietnameseTones(selectedLower);
          
          return allTags.some(tag => {
            const tagWithoutTones = removeVietnameseTones(tag);
            return tag.includes(selectedLower) || 
                   selectedLower.includes(tag) ||
                   tagWithoutTones.includes(selectedWithoutTones) ||
                   selectedWithoutTones.includes(tagWithoutTones);
          });
        });
      });
    }

    // Sắp xếp meals theo mealTime: breakfast (sáng) -> lunch (trưa) -> dinner (tối)
    allMeals.sort((a, b) => {
      const getMealTimeOrder = (meal) => {
        const mealTimes = meal.mealTime || [];
        if (mealTimes.includes('breakfast')) return 0;
        if (mealTimes.includes('lunch')) return 1;
        if (mealTimes.includes('dinner')) return 2;
        return 3; // Không có mealTime thì đặt cuối
      };
      return getMealTimeOrder(a) - getMealTimeOrder(b);
    });

    return allMeals;
  } catch (error) {
    console.error('Error searching meals:', error);
    // Nếu lỗi, fallback về mock data để test UI
    return getMockMeals({ searchText, ingredients });
  }
}

/**
 * Mock data để test UI khi backend chưa sẵn sàng
 * TODO: Xóa function này khi backend API đã hoàn thiện
 */
function getMockMeals({ searchText = '', ingredients = [] }) {
  // Mock database meals
  const allMeals = [
    { id: '1', title: 'BÁNH MÌ TRỨNG\n+ PATE + RAU', desc: 'Bánh mì, trứng gà, pate, rau', time: '5 phút', mealIngredients: ['Trứng gà', 'Rau củ'] },
    { id: '2', title: 'CƠM GÀ NGŨ VỊ', desc: 'Cơm, thịt gà, rau củ', time: '20 phút', mealIngredients: ['Thịt gà', 'Rau củ'] },
    { id: '3', title: 'BÚN THỊT NƯỚNG', desc: 'Bún, thịt heo, rau sống', time: '25 phút', mealIngredients: ['Thịt heo', 'Rau củ'] },
    { id: '4', title: 'CÁ LÓC KHO TỘ', desc: 'Cá lóc, nước mắm, đường', time: '30 phút', mealIngredients: ['Cá lóc'] },
    { id: '5', title: 'TÔM RANG ME', desc: 'Tôm, me, ớt', time: '15 phút', mealIngredients: ['Tôm'] },
    { id: '6', title: 'MỰC XÀO CHUA NGỌT', desc: 'Mực, cà chua, dứa', time: '20 phút', mealIngredients: ['Mực'] },
    { id: '7', title: 'SƯỜN HEO KHO', desc: 'Sườn heo, nước mắm', time: '45 phút', mealIngredients: ['Sườn heo'] },
    { id: '8', title: 'CƠM THỊT BÒ XÀO', desc: 'Cơm, thịt bò, rau', time: '18 phút', mealIngredients: ['Thịt bò', 'Rau củ'] },
    { id: '9', title: 'ĐẬU HŨ CHIÊN', desc: 'Đậu hũ, nước mắm, hành lá', time: '10 phút', mealIngredients: ['Đậu hũ'] },
    { id: '10', title: 'TRỨNG VỊT LỘN', desc: 'Trứng vịt, rau răm', time: '15 phút', mealIngredients: ['Trứng vịt'] },
  ];

  // Lọc theo search text - tìm kiếm trong tên món, mô tả, và nguyên liệu
  let filtered = allMeals;
  if (searchText && searchText.trim()) {
    const searchLower = searchText.toLowerCase().trim();
    const searchTerms = searchLower.split(/\s+/).filter(term => term.length > 0);
    
    filtered = filtered.filter(meal => {
      const titleLower = (meal.title || '').toLowerCase().replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      const descLower = (meal.desc || '').toLowerCase();
      const ingredientNames = (meal.mealIngredients || []).join(' ').toLowerCase();
      
      const searchTextCombined = `${titleLower} ${descLower} ${ingredientNames}`;
      
      if (searchTerms.length === 1) {
        // Tìm kiếm một từ - tìm trong tên, mô tả, hoặc nguyên liệu
        return titleLower.includes(searchTerms[0]) || 
               descLower.includes(searchTerms[0]) || 
               ingredientNames.includes(searchTerms[0]);
      } else {
        // Tìm kiếm nhiều từ - tất cả các từ phải có trong text
        return searchTerms.every(term => searchTextCombined.includes(term));
      }
    });
  }

  // Lọc theo ingredients được chọn
  if (ingredients && ingredients.length > 0) {
    filtered = filtered.filter(meal => {
      // Kiểm tra nếu ít nhất một nguyên liệu được chọn có trong mealIngredients
      return ingredients.some(selectedIng => 
        meal.mealIngredients.some(mealIng => 
          mealIng.toLowerCase().includes(selectedIng.toLowerCase()) ||
          selectedIng.toLowerCase().includes(mealIng.toLowerCase())
        )
      );
    });
  }

  return filtered;
}

/**
 * Lấy meal plan mới nhất của user từ backend
 * @returns {Promise<Object|null>} Meal plan object hoặc null nếu không có
 */
export async function getLatestMealPlan() {
  try {
    const headers = await getAuthHeaders();
    const url = `${BASE_URL}/meals/recommendation/latest`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: headers,
    });

    if (response.status === 404) {
      console.log('No meal plan found');
      return null;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await handleJson(response);
    return result.data || null;
  } catch (error) {
    console.error('Error getting latest meal plan:', error);
    return null;
  }
}

/**
 * Lấy lịch sử meal plan của user từ backend
 * @param {Object} params - Tham số
 * @param {number} params.page - Số trang (mặc định 1)
 * @param {number} params.limit - Số items mỗi trang (mặc định 10)
 * @returns {Promise<Object|null>} Response với data và pagination hoặc null
 */
export async function getMealPlanHistory({ page = 1, limit = 10 } = {}) {
  try {
    const headers = await getAuthHeaders();
    
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());

    const url = `${BASE_URL}/meals/recommendation/history${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: headers,
    });

    if (response.status === 404) {
      console.log('Meal plan history endpoint not found');
      return null;
    }

    if (!response.ok) {
      // Nếu là lỗi 401, có thể token hết hạn - sẽ được xử lý bởi callWithAutoRefresh
      if (response.status === 401) {
        throw new Error('401 Unauthorized');
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await handleJson(response);
    
    // Đảm bảo result có cấu trúc đúng
    if (!result || !result.data) {
      console.warn('Invalid response structure from getAllMeals:', result);
      return { data: [], pagination: { hasNextPage: false } };
    }
    
    return result;
  } catch (error) {
    console.error('Error getting meal plan history:', error);
    return null;
  }
}