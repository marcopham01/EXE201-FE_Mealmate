import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from './auth';

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
  } catch {
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
  // Extract ingredient names từ array ingredients (đã được populate)
  const ingredientNames = (meal.ingredients || []).map(ing => ing?.name || '').filter(Boolean);
  
  // Tạo description từ ingredients hoặc dùng description từ backend
  const desc = meal.description || ingredientNames.join(', ');
  
  // Ước tính thời gian nấu từ số lượng instructions (giả định mỗi bước ~5 phút)
  // Hoặc có thể lấy từ field khác nếu backend có
  const estimatedTime = meal.instructions?.length 
    ? `${Math.max(5, meal.instructions.length * 3)} phút`
    : '15 phút';

  return {
    id: meal._id || meal.id,
    title: meal.name || '',
    desc: desc,
    time: estimatedTime,
    mealIngredients: ingredientNames,
    // Giữ lại các field cần thiết khác từ backend
    image: meal.image,
    totalKcal: meal.totalKcal,
    dietType: meal.dietType,
    mealTime: meal.mealTime,
    category: meal.category,
    subCategory: meal.subCategory,
    rating: meal.rating,
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

    const url = `${BASE_URL}/meals/getallmeal${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: headers,
    });

    // Nếu endpoint không tồn tại (404), trả về null để báo hiệu cần dùng mock data
    // Chỉ log ở debug mode để tránh spam console
    if (response.status === 404) {
      // Không log ở đây để tránh spam - sẽ log ở searchMeals nếu cần
      return null;
    }

    if (!response.ok) {
      // Nếu lỗi khác 404, vẫn throw để fallback
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await handleJson(response);
    
    // Transform data từ backend format sang frontend format
    if (result.data && Array.isArray(result.data)) {
      result.data = result.data.map(transformMealFromBackend);
    }
    
    return result;
  } catch (error) {
    // Nếu lỗi, trả về null để fallback về mock data
    // Chỉ log network errors, không log 404 vì đó là behavior bình thường
    if (error.message && !error.message.includes('404')) {
      console.log('Error getting all meals:', error.message);
    }
    return null;
  }
}

/**
 * Tìm kiếm meals trong database dựa trên nguyên liệu
 * @param {Object} params - Tham số tìm kiếm
 * @param {string} params.searchText - Từ khóa tìm kiếm (tên món ăn hoặc nguyên liệu)
 * @param {Array<string>} params.ingredients - Mảng các nguyên liệu được chọn từ tags
 * @returns {Promise<Array>} Danh sách meals tìm được (đã transform)
 */
export async function searchMeals({ searchText = '', ingredients = [] }) {
  try {
    const headers = await getAuthHeaders();
    
    // Thử gọi endpoint search mới trước (nếu backend đã có)
    try {
      const queryParams = new URLSearchParams();
      if (searchText && searchText.trim()) {
        queryParams.append('search', searchText.trim());
      }
      if (ingredients && ingredients.length > 0) {
        ingredients.forEach(ing => {
          queryParams.append('ingredients', ing);
        });
      }

      const searchUrl = `${BASE_URL}/meals/search${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const searchResponse = await fetch(searchUrl, {
        method: 'GET',
        headers: headers,
      });

      // Nếu endpoint search không tồn tại (404), bỏ qua và dùng fallback
      if (searchResponse.status === 404) {
        // Không log - đây là behavior bình thường khi backend chưa có endpoint
        // Tiếp tục với fallback
      } else if (searchResponse.ok) {
        const result = await handleJson(searchResponse);
        // Transform data nếu là array
        if (Array.isArray(result)) {
          const transformed = result.map(transformMealFromBackend);
          return transformed.length > 0 ? transformed : [];
        }
        if (result.data && Array.isArray(result.data)) {
          const transformed = result.data.map(transformMealFromBackend);
          return transformed.length > 0 ? transformed : [];
        }
        // Nếu result không có data hoặc data rỗng, trả về array rỗng
        return [];
      } else {
        // Nếu response không ok và không phải 404, fallback
        // Chỉ log các lỗi khác 404 (401, 403, 500, etc.)
        if (searchResponse.status !== 404) {
          console.log('Search endpoint returned error status:', searchResponse.status);
        }
      }
    } catch (searchError) {
      // Nếu endpoint search chưa có, fallback sang getAllMeals và filter ở client
      // Chỉ log network errors, không log 404
      if (searchError.message && !searchError.message.includes('404')) {
        console.log('Search endpoint error:', searchError.message);
      }
    }

    // Fallback: Thử lấy tất cả meals từ backend và filter ở client side
    const allMealsResult = await getAllMeals({ page: 1, limit: 100 });
    let meals = [];
    
    // Nếu getAllMeals trả về data hợp lệ từ backend
    if (allMealsResult && allMealsResult.data && Array.isArray(allMealsResult.data)) {
      meals = allMealsResult.data;
    } else if (allMealsResult && Array.isArray(allMealsResult)) {
      meals = allMealsResult;
    } else {
      // Nếu backend không có data hoặc lỗi, dùng mock data ngay
      // Không log - đây là behavior bình thường khi backend chưa có endpoint
      return getMockMeals({ searchText, ingredients });
    }

    // Filter theo searchText - tìm kiếm trong tên món, mô tả, và nguyên liệu
    if (searchText && searchText.trim()) {
      const searchLower = searchText.toLowerCase().trim();
      const searchTerms = searchLower.split(/\s+/).filter(term => term.length > 0);
      
      meals = meals.filter(meal => {
        const titleLower = (meal.title || '').toLowerCase().replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        const descLower = (meal.desc || '').toLowerCase();
        const ingredientNames = (meal.mealIngredients || []).join(' ').toLowerCase();
        
        // Tìm kiếm: nếu có nhiều từ, ít nhất một từ phải match
        // Hoặc nếu là một từ, tìm trong tên, mô tả, hoặc nguyên liệu
        const searchTextCombined = `${titleLower} ${descLower} ${ingredientNames}`;
        
        if (searchTerms.length === 1) {
          // Tìm kiếm một từ - tìm trong tên, mô tả, hoặc nguyên liệu
          return titleLower.includes(searchTerms[0]) || 
                 descLower.includes(searchTerms[0]) || 
                 ingredientNames.includes(searchTerms[0]);
        } else {
          // Tìm kiếm nhiều từ - tất cả các từ phải có trong text (có thể ở các vị trí khác nhau)
          return searchTerms.every(term => searchTextCombined.includes(term));
        }
      });
    }

    // Filter theo ingredients được chọn
    if (ingredients && ingredients.length > 0) {
      meals = meals.filter(meal => {
        const mealIngs = (meal.mealIngredients || []).map(ing => ing.toLowerCase());
        // Kiểm tra nếu ít nhất một nguyên liệu được chọn có trong mealIngredients
        return ingredients.some(selectedIng => {
          const selectedLower = selectedIng.toLowerCase();
          return mealIngs.some(mealIng => 
            mealIng.includes(selectedLower) || 
            selectedLower.includes(mealIng) ||
            // Match một phần (ví dụ: "Thịt heo" match với "thịt")
            mealIng.includes(selectedLower.split(' ')[0]) ||
            selectedLower.includes(mealIng.split(' ')[0])
          );
        });
      });
    }

    return meals;
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
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await handleJson(response);
    return result;
  } catch (error) {
    console.error('Error getting meal plan history:', error);
    return null;
  }
}