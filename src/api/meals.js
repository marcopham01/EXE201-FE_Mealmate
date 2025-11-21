import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL, callWithAutoRefresh } from './auth';

// ==================== CACHE & REQUEST DEDUPLICATION ====================

// Simple in-memory cache với TTL (Time To Live)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 phút
const pendingRequests = new Map(); // Request deduplication

/**
 * Tạo cache key từ params
 */
function getCacheKey(endpoint, params = {}) {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  return `${endpoint}${sortedParams ? `|${sortedParams}` : ''}`;
}

/**
 * Lấy từ cache nếu còn valid
 */
function getFromCache(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  if (cached) {
    cache.delete(key); // Xóa cache hết hạn
  }
  return null;
}

/**
 * Lưu vào cache
 */
function setCache(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Xóa cache
 */
function clearCache(pattern = null) {
  if (!pattern) {
    cache.clear();
    pendingRequests.clear(); // Clear pending requests khi clear all cache
    return;
  }
  // Xóa cache theo pattern
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

/**
 * Export clearCache để có thể gọi từ bên ngoài (khi logout/đăng nhập user mới)
 * Clear tất cả cache và pending requests
 */
export function clearMealsCache() {
  cache.clear();
  pendingRequests.clear();
  console.log('[clearMealsCache] Cleared all meals cache and pending requests');
}

/**
 * Request deduplication - tránh gọi API nhiều lần cùng lúc
 */
async function deduplicateRequest(key, requestFn) {
  // Nếu đã có request đang chạy, đợi kết quả
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }
  
  // Tạo promise mới
  const promise = requestFn()
    .then(result => {
      pendingRequests.delete(key);
      return result;
    })
    .catch(error => {
      pendingRequests.delete(key);
      throw error;
    });
  
  pendingRequests.set(key, promise);
  return promise;
}

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
    // Log token prefix để debug (không log full token vì bảo mật)
    console.log('[getAuthHeaders] Token exists, length:', token.length);
  } else {
    console.warn('[getAuthHeaders] No access token found in AsyncStorage');
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

  // Xử lý image: giữ nguyên URL từ database, không thay đổi
  // Log để debug nếu phát hiện unsplash URL (có thể backend đang trả về sai)
  let imageUrl = meal.image || null;
  if (imageUrl && typeof imageUrl === 'string') {
    // Log cảnh báo nếu phát hiện unsplash URL (có thể backend đang generate thay vì dùng URL từ database)
    if (imageUrl.includes('unsplash.com')) {
      console.warn('[transformMealFromBackend] WARNING: Backend returned unsplash URL instead of database image URL:', {
        mealId: meal._id || meal.id,
        mealName: meal.name || meal.title,
        unsplashUrl: imageUrl,
        expected: 'Should use image URL from database field'
      });
    }
    // Giữ nguyên URL từ backend (dù là unsplash hay database URL)
    // Frontend không thể biết URL đúng từ database nếu backend không trả về
  } else {
    // Chỉ dùng placeholder nếu không có image
    imageUrl = 'https://via.placeholder.com/150';
  }

  return {
    id: meal._id || meal.id,
    title: meal.name || meal.title || 'Món ăn', // Backend trả về 'name'
    desc: desc,
    time: estimatedTime,
    mealIngredients: ingredientNames, // Lưu danh sách tên nguyên liệu để filter
    instructions: meal.instructions || [],
    image: imageUrl,
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
 * @param {boolean} params.forceRefresh - Bỏ qua cache nếu true
 * @returns {Promise<Object>} Response với data và pagination
 */
export async function getAllMeals({ page = 1, limit = 50, forceRefresh = false } = {}) {
  const cacheKey = getCacheKey('getAllMeals', { page, limit });
  
  // Kiểm tra cache trước
  if (!forceRefresh) {
    const cached = getFromCache(cacheKey);
    if (cached) {
      console.log(`[getAllMeals] Using cache for page ${page}`);
      return cached;
    }
  }
  
  return deduplicateRequest(cacheKey, async () => {
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
          // Log để debug image URL từ backend
          if (meal.image) {
            console.log('[getAllMeals] Meal image from backend:', {
              mealId: meal._id || meal.id,
              mealName: meal.name || meal.title,
              imageUrl: meal.image,
              isUnsplash: meal.image.includes('unsplash.com')
            });
          }
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
    
    // Lưu vào cache
    setCache(cacheKey, result);
    
    return result;
    } catch (error) {
      console.error('[getAllMeals] Error:', error.message, error);
      throw error;
    }
  });
}

/**
 * Lấy chi tiết món ăn theo id
 * @param {string} id - ID của meal
 * @param {boolean} forceRefresh - Bỏ qua cache nếu true
 * @returns {Promise<Object>} Meal object đã transform
 */
export async function getMealById(id, forceRefresh = false) {
  const cacheKey = getCacheKey('getMealById', { id });
  
  // Kiểm tra cache trước
  if (!forceRefresh) {
    const cached = getFromCache(cacheKey);
    if (cached) {
      console.log(`[getMealById] Using cache for meal ${id}`);
      return cached;
    }
  }
  
  return deduplicateRequest(cacheKey, async () => {
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
    let transformed = null;
    if (result.data) {
      transformed = transformMealFromBackend(result.data);
      // Lưu vào cache
      setCache(cacheKey, transformed);
      return transformed;
    }
    
    return null;
    } catch (error) {
      console.error('Error getting meal by id:', error.message);
      throw error;
    }
  });
}

/**
 * Tìm kiếm meals theo tên sử dụng API searchmeal
 * @param {Object} params - Tham số tìm kiếm
 * @param {string} params.name - Tên món ăn cần tìm kiếm
 * @param {number} params.page - Số trang (mặc định 1)
 * @param {number} params.limit - Số lượng món ăn mỗi trang (mặc định 10)
 * @param {boolean} params.forceRefresh - Bỏ qua cache nếu true
 * @returns {Promise<Object>} Response với data và pagination
 */
export async function searchMealsByAPI({ name = '', page = 1, limit = 10, forceRefresh = false } = {}) {
  const cacheKey = getCacheKey('searchMealsByAPI', { name: name.trim().toLowerCase(), page, limit });
  
  // Kiểm tra cache trước (chỉ cache nếu có name)
  if (!forceRefresh && name.trim()) {
    const cached = getFromCache(cacheKey);
    if (cached) {
      console.log(`[searchMealsByAPI] Using cache for "${name}" page ${page}`);
      return cached;
    }
  }
  
  return deduplicateRequest(cacheKey, async () => {
    try {
      const headers = await getAuthHeaders();
    
    // Kiểm tra name không được để trống
    if (!name || !name.trim()) {
      throw new Error('Tên món ăn không được để trống');
    }
    
    const queryParams = new URLSearchParams();
    queryParams.append('name', name.trim());
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());
    
    const url = `${BASE_URL}/meal/searchmeal?${queryParams.toString()}`;
    
    console.log(`[searchMealsByAPI] Searching: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: headers,
    });
    
    console.log(`[searchMealsByAPI] Response status: ${response.status}`);
    
    if (!response.ok) {
      if (response.status === 400) {
        const errorData = await handleJson(response);
        throw new Error(errorData?.message || 'Tên món ăn không được để trống');
      }
      if (response.status === 401) {
        console.error('[searchMealsByAPI] 401 Unauthorized - Token might be expired');
        throw new Error('401 Unauthorized');
      }
      const errorText = await response.text();
      console.error(`[searchMealsByAPI] HTTP ${response.status} error:`, errorText);
      throw new Error(`HTTP ${response.status}`);
    }
    
    const result = await handleJson(response);
    
    // Log chi tiết response structure để debug
    console.log(`[searchMealsByAPI] Full response:`, JSON.stringify(result, null, 2));
    console.log(`[searchMealsByAPI] Response structure:`, {
      hasData: !!result?.data,
      dataIsArray: Array.isArray(result?.data),
      dataLength: result?.data?.length || 0,
      dataType: typeof result?.data,
      hasPagination: !!result?.pagination,
      resultKeys: result ? Object.keys(result) : [],
    });
    
    // Xử lý response - có thể data là array trực tiếp hoặc nằm trong object
    let mealsArray = [];
    
    if (result) {
      // Nếu data là array trực tiếp
      if (Array.isArray(result.data)) {
        mealsArray = result.data;
      }
      // Nếu data là object có items bên trong (structure: {data: {items: [...], pagination: {...}}})
      else if (result.data && typeof result.data === 'object' && Array.isArray(result.data.items)) {
        mealsArray = result.data.items;
      }
      // Nếu result là array trực tiếp (không có wrapper)
      else if (Array.isArray(result)) {
        mealsArray = result;
      }
      // Nếu có success và data
      else if (result.success && result.data) {
        if (Array.isArray(result.data)) {
          mealsArray = result.data;
        } else if (Array.isArray(result.data.items)) {
          mealsArray = result.data.items;
        }
      }
    }
    
    console.log(`[searchMealsByAPI] Extracted meals array length: ${mealsArray.length}`);
    
    // Transform data từ backend format sang frontend format
    if (mealsArray.length > 0) {
      const transformedData = mealsArray.map(meal => {
        try {
          return transformMealFromBackend(meal);
        } catch (transformError) {
          console.error('[searchMealsByAPI] Error transforming meal:', transformError, meal);
          return null;
        }
      }).filter(meal => meal !== null);
      
      console.log(`[searchMealsByAPI] Transformed ${transformedData.length} meals from ${mealsArray.length} raw meals`);
      result.data = transformedData;
    } else {
      console.warn('[searchMealsByAPI] No meals found in response');
      result.data = [];
    }
    
    // Đảm bảo result tồn tại
    if (!result) {
      result = {};
    }
    
    // Normalize pagination
    if (result.pagination) {
      result.pagination = {
        page: result.pagination.page || page,
        limit: result.pagination.limit || limit,
        total: result.pagination.total || 0,
        totalPages: result.pagination.totalPages || 1,
        hasNextPage: result.pagination.hasNextPage || false,
        hasPrevPage: result.pagination.hasPrevPage || false,
      };
    } else {
      result.pagination = {
        page: page,
        limit: limit,
        total: result.data?.length || 0,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      };
    }
    
    // Đảm bảo result.data là array
    if (!result.data) {
      result.data = [];
    }
    
    // Lưu vào cache (chỉ cache nếu có name)
    if (name.trim()) {
      setCache(cacheKey, result);
    }
    
    return result;
    } catch (error) {
      console.error('[searchMealsByAPI] Error:', error.message, error);
      throw error;
    }
  });
}

/**
 * Tìm kiếm meals trong database dựa trên tên món ăn và tag (nguyên liệu)
 * Sử dụng API searchmeal mới cho search theo tên, filter ingredients ở client side
 * @param {Object} params - Tham số tìm kiếm
 * @param {string} params.searchText - Từ khóa tìm kiếm (tên món ăn)
 * @param {Array<string>} params.ingredients - Mảng các nguyên liệu được chọn từ tags
 * @returns {Promise<Array>} Danh sách meals tìm được (đã transform và sắp xếp theo mealTime)
 */
export async function searchMeals({ searchText = '', ingredients = [] }) {
  try {
    let allMeals = [];
    
    // Nếu có searchText, sử dụng API searchmeal mới
    if (searchText && searchText.trim()) {
      console.log('[searchMeals] Using searchMealsByAPI for name search');
      try {
        // Lấy tất cả kết quả với pagination
        let currentPage = 1;
        const limit = 50;
        let hasMore = true;
        
        while (hasMore && allMeals.length < 200) {
          const result = await searchMealsByAPI({ 
            name: searchText.trim(), 
            page: currentPage, 
            limit 
          });
          
          if (result && result.data && Array.isArray(result.data)) {
            allMeals = [...allMeals, ...result.data];
            console.log(`[searchMeals] Page ${currentPage}: Got ${result.data.length} meals, total: ${allMeals.length}`);
            hasMore = result.pagination?.hasNextPage || false;
            currentPage++;
            
            if (result.data.length === 0) {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
        }
      } catch (apiError) {
        console.warn('[searchMeals] API search failed, returning empty array:', apiError.message);
        // Nếu API searchmeal lỗi, trả về mảng rỗng
        return [];
      }
    } else {
      // Nếu không có searchText, lấy tất cả meals từ getAllMeals
      console.log('[searchMeals] No searchText, fetching all meals');
      let currentPage = 1;
      const limit = 50;
      let hasMore = true;
      
      while (hasMore && allMeals.length < 200) {
        try {
          const result = await getAllMeals({ page: currentPage, limit });
          
          if (result && result.data && Array.isArray(result.data)) {
            allMeals = [...allMeals, ...result.data];
            hasMore = result.pagination?.hasNextPage || false;
            currentPage++;
            
            if (result.data.length === 0) {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
        } catch (error) {
          console.error(`[searchMeals] Error fetching meals page ${currentPage}:`, error.message);
          hasMore = false;
        }
      }
    }
    
    console.log(`[searchMeals] Finished fetching. Total meals: ${allMeals.length}`);
    
    // Nếu không có data, trả về mảng rỗng
    if (allMeals.length === 0) {
      console.warn('[searchMeals] No meals from API, returning empty array');
      return [];
    }

    // Filter theo ingredients (tags) - tìm trong tag array của meal
    // Chỉ filter ingredients nếu có ingredients được chọn
    // (searchText đã được xử lý bởi API searchmeal)
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
    // Nếu lỗi, trả về mảng rỗng
    return [];
  }
}

/**
 * Lấy meal plan mới nhất của user từ backend
 * @returns {Promise<Object|null>} Meal plan object hoặc null nếu không có
 */
export async function getLatestMealPlan() {
  try {
    const headers = await getAuthHeaders();
    const url = `${BASE_URL}/meal/recommendation/latest`;
    
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

/**
 * Gợi ý thực đơn theo BMI cho user hiện tại
 * @param {Object} body
 * @param {number} body.heightCm
 * @param {number} body.weightKg
 * @param {string} body.activityLevel
 * @param {string} body.goal
 * @returns {Promise<Object|null>} Response data từ server
 */
export async function recommendMealsByBMI(body) {
  try {
    const headers = await getAuthHeaders();
    const url = `${BASE_URL}/meal/recommendation/bmi`;

    // Sanitize payload to fit backend constraints
    const normalize = (s) =>
      (s || '')
        .toString()
        .replace(/\u00A0/g, ' ')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[‘’'“”]/g, '')
        .replace(/\s+/g, ' ');

    // Normalize activityLevel để match với backend (backend check trong allowedLevels với keys không dấu)
    const activityInput = body?.activityLevel || '';
    const lvNorm = normalize(activityInput).trim(); // Đảm bảo trim để loại bỏ khoảng trắng thừa
    
    // Gửi format không dấu trực tiếp để match với backend allowedLevels keys
    // Backend keys: "it van dong", "van dong vua phai", "van dong nhieu"
    let activityLevel = 'van dong vua phai'; // default (không dấu)
    
    // Check chính xác với normalized value
    if (lvNorm === 'it van dong') {
      activityLevel = 'it van dong';
    } else if (lvNorm === 'van dong nhieu') {
      activityLevel = 'van dong nhieu';
    } else if (lvNorm === 'van dong vua phai') {
      activityLevel = 'van dong vua phai';
    } else {
      // Fallback: check với includes nếu không match chính xác
      if (lvNorm.includes('it van dong')) {
        activityLevel = 'it van dong';
      } else if (lvNorm.includes('van dong nhieu')) {
        activityLevel = 'van dong nhieu';
      } else if (lvNorm.includes('van dong vua phai')) {
        activityLevel = 'van dong vua phai';
      } else {
        // Log để debug nếu không match
        console.warn('[recommendMealsByBMI] Unknown activityLevel:', activityInput, 'normalized:', lvNorm);
      }
    }

    const goalNorm = normalize(body?.goal);
    let goal = 'Duy trì cân nặng';
    if (goalNorm.includes('giam')) goal = 'Giảm cân';
    else if (goalNorm.includes('tang')) goal = 'Tăng cân';

    const payload = {
      heightCm: Number(body?.heightCm),
      weightKg: Number(body?.weightKg),
      activityLevel,
      goal,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      // Tránh log lỗi đỏ gây khó chịu; chỉ warning và trả null để UI fallback
      console.warn('recommendMealsByBMI HTTP error:', response.status, text);
      return null;
    }

    const result = await handleJson(response);
    return result?.data || null;
  } catch (error) {
    console.warn('Error calling recommendMealsByBMI:', error?.message || error);
    return null;
  }
}

/**
 * Phân tích nguyên liệu từ ảnh sử dụng AI (Gemini)
 * @param {Object} params - Tham số
 * @param {string} params.imageUri - URI của ảnh (file:// hoặc http://)
 * @param {string} params.userId - ID của user (optional, có thể lấy từ token)
 * @param {number} params.heightCm - Chiều cao (cm)
 * @param {number} params.weightKg - Cân nặng (kg)
 * @param {number} params.bmi - BMI
 * @returns {Promise<Object|null>} Kết quả phân tích với danh sách nguyên liệu và gợi ý món ăn
 */
export async function analyzeIngredientsFromImage({ imageUri, userId, heightCm, weightKg, bmi }) {
  try {
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) {
      throw new Error('Missing access token');
    }

    // Tạo FormData để gửi multipart/form-data
    const formData = new FormData();
    
    // Thêm ảnh vào formData
    // Xử lý URI: nếu là file:// thì cần convert sang format phù hợp
    const imageFile = {
      uri: imageUri,
      type: 'image/jpeg', // Hoặc 'image/png' tùy vào format ảnh
      name: 'image.jpg', // Tên file
    };
    formData.append('image', imageFile);
    
    // Thêm các tham số khác nếu có
    if (userId) {
      formData.append('userId', userId);
    }
    if (heightCm !== undefined && heightCm !== null) {
      formData.append('heightCm', heightCm.toString());
    }
    if (weightKg !== undefined && weightKg !== null) {
      formData.append('weightKg', weightKg.toString());
    }
    if (bmi !== undefined && bmi !== null) {
      formData.append('bmi', bmi.toString());
    }

    const url = `${BASE_URL}/ai/ingredients-from-image`;
    
    console.log('[analyzeIngredientsFromImage] Calling API:', url);
    console.log('[analyzeIngredientsFromImage] Params:', { userId, heightCm, weightKg, bmi });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Không set Content-Type, để browser tự động set với boundary cho multipart/form-data
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[analyzeIngredientsFromImage] HTTP error:', response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await handleJson(response);
    console.log('[analyzeIngredientsFromImage] Success:', result);
    
    // Backend trả về trực tiếp: { success, ingredientsDetected, matchedIngredients, meals }
    // Không wrap trong data
    if (result && result.success !== false) {
      return {
        ingredientsDetected: result.ingredientsDetected || [],
        matchedIngredients: result.matchedIngredients || [],
        meals: result.meals || [],
        note: result.note || null,
      };
    }
    
    return null;
  } catch (error) {
    console.error('[analyzeIngredientsFromImage] Error:', error?.message || error);
    throw error;
  }
}

// ==================== SAVED MEALS APIs ====================

/**
 * Lưu hoặc cập nhật ghi chú cho một món ăn của user hiện tại
 * @param {Object} params - Tham số
 * @param {string} params.mealId - ID của món ăn
 * @param {string} params.note - Ghi chú (optional)
 * @param {Array<string>} params.tags - Tags (optional)
 * @returns {Promise<Object>} Saved meal object từ server
 */
export async function saveMealToServer({ mealId, note = '', tags = [] }) {
  return callWithAutoRefresh(async () => {
    // Xóa cache liên quan
    clearCache('getSavedMealsFromServer');
    
    try {
      const headers = await getAuthHeaders();
      const url = `${BASE_URL}/meal/saved`;
      
      const payload = {
        mealId,
        note: note || '',
        tags: tags || [],
      };
      
      console.log('[saveMealToServer] Saving meal:', payload);
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        if (response.status === 400) {
          const errorData = await handleJson(response);
          throw new Error(errorData?.message || 'Thiếu hoặc sai mealId');
        }
        if (response.status === 401) {
          throw new Error('401 Unauthorized');
        }
        if (response.status === 404) {
          throw new Error('Không tìm thấy món ăn');
        }
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await handleJson(response);
      
      // Transform meal từ backend format sang frontend format
      if (result.data && result.data.meal) {
        result.data.meal = transformMealFromBackend(result.data.meal);
      }
      
      console.log('[saveMealToServer] Success:', result);
      return result.data;
    } catch (error) {
      console.error('[saveMealToServer] Error:', error.message);
      throw error;
    }
  });
}

/**
 * Lấy danh sách món ăn đã lưu theo user
 * @param {Object} params - Tham số
 * @param {number} params.page - Số trang (mặc định 1)
 * @param {number} params.limit - Số items mỗi trang (mặc định 20)
 * @param {boolean} params.forceRefresh - Bỏ qua cache nếu true
 * @returns {Promise<Object>} Response với data và pagination
 */
export async function getSavedMealsFromServer({ page = 1, limit = 20, forceRefresh = false } = {}) {
  const cacheKey = getCacheKey('getSavedMealsFromServer', { page, limit });
  
  // Kiểm tra cache trước
  if (!forceRefresh) {
    const cached = getFromCache(cacheKey);
    if (cached) {
      console.log(`[getSavedMealsFromServer] Using cache for page ${page}`);
      return cached;
    }
  }
  
  return callWithAutoRefresh(async () => {
    return deduplicateRequest(cacheKey, async () => {
      try {
        const headers = await getAuthHeaders();
      
      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      queryParams.append('limit', limit.toString());
      
      const url = `${BASE_URL}/meal/saved?${queryParams.toString()}`;
      
      console.log('[getSavedMealsFromServer] Fetching:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          const errorText = await response.text();
          console.error('[getSavedMealsFromServer] 401 Unauthorized - Response:', errorText);
          console.error('[getSavedMealsFromServer] Headers sent:', JSON.stringify(headers));
          throw new Error('401 Unauthorized');
        }
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await handleJson(response);
      
      // Transform meals từ backend format sang frontend format
      if (result.data && Array.isArray(result.data)) {
        result.data = result.data.map(item => {
          if (item.meal) {
            item.meal = transformMealFromBackend(item.meal);
          }
          return item;
        });
      }
      
      console.log('[getSavedMealsFromServer] Success:', {
        count: result.data?.length || 0,
        pagination: result.pagination,
      });
      
      // Lưu vào cache
      setCache(cacheKey, result);
      
      return result;
      } catch (error) {
        console.error('[getSavedMealsFromServer] Error:', error.message);
        throw error;
      }
    });
  });
}

/**
 * Xóa món ăn đã lưu của user
 * @param {string} mealId - ID của món ăn cần xóa
 * @returns {Promise<boolean>} true nếu xóa thành công
 */
export async function deleteSavedMealFromServer(mealId) {
  return callWithAutoRefresh(async () => {
    // Xóa cache liên quan
    clearCache('getSavedMealsFromServer');
    
    try {
      const headers = await getAuthHeaders();
      const url = `${BASE_URL}/meal/saved/${mealId}`;
      
      console.log('[deleteSavedMealFromServer] Deleting meal:', mealId);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers,
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Không có món ăn này trong danh sách lưu');
        }
        if (response.status === 401) {
          throw new Error('401 Unauthorized');
        }
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      console.log('[deleteSavedMealFromServer] Success');
      return true;
    } catch (error) {
      console.error('[deleteSavedMealFromServer] Error:', error.message);
      throw error;
    }
  });
}

// ==================== MEAL LOGS APIs ====================

/**
 * Ghi lại một bữa ăn trong nhật ký cá nhân
 * @param {Object} params - Tham số
 * @param {string} params.mealId - ID của món ăn
 * @param {string} params.mealTime - Buổi ăn ('breakfast', 'lunch', 'dinner')
 * @param {string} params.date - Ngày (format: 'YYYY-MM-DD')
 * @param {number} params.portion - Phần ăn (mặc định 1)
 * @param {string} params.note - Ghi chú (optional)
 * @param {number} params.caloriesOverride - Calories override (optional)
 * @returns {Promise<Object>} Meal log object từ server
 */
export async function logMealToServer({ mealId, mealTime, date, portion = 1, note = '', caloriesOverride = 0 }) {
  return callWithAutoRefresh(async () => {
    // Xóa cache liên quan
    clearCache('getMealLogsFromServer');
    
    try {
      const headers = await getAuthHeaders();
      const url = `${BASE_URL}/meal/logs`;
      
      const payload = {
        mealId,
        mealTime,
        date,
        portion: portion || 1,
        note: note || '',
        caloriesOverride: caloriesOverride || 0,
      };
      
      console.log('[logMealToServer] Logging meal:', payload);
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          const errorText = await response.text();
          console.error('[getMealLogsFromServer] 401 Unauthorized - Response:', errorText);
          console.error('[getMealLogsFromServer] Headers sent:', JSON.stringify(headers));
          throw new Error('401 Unauthorized');
        }
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await handleJson(response);
      
      // Transform meal từ backend format sang frontend format
      if (result.data && result.data.meal) {
        result.data.meal = transformMealFromBackend(result.data.meal);
      }
      
      console.log('[logMealToServer] Success:', result);
      return result.data;
    } catch (error) {
      console.error('[logMealToServer] Error:', error.message);
      throw error;
    }
  });
}

/**
 * Lấy nhật ký bữa ăn theo khoảng ngày
 * @param {Object} params - Tham số
 * @param {string} params.startDate - Ngày bắt đầu (format: 'YYYY-MM-DD')
 * @param {string} params.endDate - Ngày kết thúc (format: 'YYYY-MM-DD')
 * @param {boolean} params.forceRefresh - Bỏ qua cache nếu true
 * @returns {Promise<Object>} Nhật ký theo ngày, format: { 'YYYY-MM-DD': { breakfast: [], lunch: [], dinner: [] } }
 */
export async function getMealLogsFromServer({ startDate, endDate, forceRefresh = false }) {
  const cacheKey = getCacheKey('getMealLogsFromServer', { startDate, endDate });
  
  // Kiểm tra cache trước
  if (!forceRefresh) {
    const cached = getFromCache(cacheKey);
    if (cached) {
      console.log(`[getMealLogsFromServer] Using cache for ${startDate} to ${endDate}`);
      return cached;
    }
  }
  
  return callWithAutoRefresh(async () => {
    return deduplicateRequest(cacheKey, async () => {
      try {
        const headers = await getAuthHeaders();
      
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      
      const url = `${BASE_URL}/meal/logs?${queryParams.toString()}`;
      
      console.log('[getMealLogsFromServer] Fetching:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          const errorText = await response.text();
          console.error('[getMealLogsFromServer] 401 Unauthorized - Response:', errorText);
          console.error('[getMealLogsFromServer] Headers sent:', JSON.stringify(headers));
          throw new Error('401 Unauthorized');
        }
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await handleJson(response);
      
      // Transform meals trong logs từ backend format sang frontend format
      if (result.data && typeof result.data === 'object') {
        Object.keys(result.data).forEach(dateKey => {
          const dayLogs = result.data[dateKey];
          if (dayLogs && typeof dayLogs === 'object') {
            ['breakfast', 'lunch', 'dinner'].forEach(mealTime => {
              if (Array.isArray(dayLogs[mealTime])) {
                dayLogs[mealTime] = dayLogs[mealTime].map(log => {
                  if (log.meal) {
                    log.meal = transformMealFromBackend(log.meal);
                  }
                  return log;
                });
              }
            });
          }
        });
      }
      
      console.log('[getMealLogsFromServer] Success:', {
        dateCount: result.data ? Object.keys(result.data).length : 0,
      });
      
      const resultData = result.data || {};
      
      // Lưu vào cache
      setCache(cacheKey, resultData);
      
      return resultData;
      } catch (error) {
        console.error('[getMealLogsFromServer] Error:', error.message);
        throw error;
      }
    });
  });
}

/**
 * Xóa một bản ghi bữa ăn theo id
 * @param {string} logId - ID của bản ghi cần xóa
 * @returns {Promise<boolean>} true nếu xóa thành công
 */
export async function deleteMealLogFromServer(logId) {
  return callWithAutoRefresh(async () => {
    // Xóa cache liên quan
    clearCache('getMealLogsFromServer');
    
    try {
      const headers = await getAuthHeaders();
      const url = `${BASE_URL}/meal/logs/${logId}`;
      
      console.log('[deleteMealLogFromServer] Deleting log:', logId);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers,
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Không tìm thấy bản ghi');
        }
        if (response.status === 401) {
          throw new Error('401 Unauthorized');
        }
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      console.log('[deleteMealLogFromServer] Success');
      return true;
    } catch (error) {
      console.error('[deleteMealLogFromServer] Error:', error.message);
      throw error;
    }
  });
}