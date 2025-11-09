/**
 * CODE BACKEND - Thêm vào MealController.js
 * Endpoint tìm kiếm meals theo tên và nguyên liệu
 * 
 * Thêm route này vào routes/meal.js:
 * router.get("/search",
 *     auth.authMiddleWare,
 *     auth.requireRole("admin","customer"),
 *     meal.searchMeals);
 * 
 * router.get("/ingredients/search",
 *     auth.authMiddleWare,
 *     auth.requireRole("admin","customer"),
 *     meal.searchIngredients);
 */

const Meal = require("../model/meal");
const Ingredient = require("../model/meal/ingredient");
const {
  createPagination,
  createPaginatedResponse,
  validatePagination,
} = require("../utils/pagination");

/**
 * Hàm chuyển đổi tiếng Việt có dấu thành không dấu
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

/**
 * Tìm kiếm meals theo tên món ăn và nguyên liệu
 * Query params:
 * - search: Từ khóa tìm kiếm (tên món ăn hoặc description)
 * - ingredients: Mảng nguyên liệu (có thể truyền nhiều lần: ?ingredients=Thịt heo&ingredients=Trứng)
 */
exports.searchMeals = async (req, res) => {
    try {
        const { search, ingredients } = req.query;
        const { page = 1, limit = 50 } = req.query;
        
        // Validate pagination
        const { page: validatedPage, limit: validatedLimit } = validatePagination(page, limit);

        // Xây dựng query MongoDB
        const query = {};

        // Tìm kiếm theo text (tên hoặc description)
        if (search && search.trim()) {
            const searchTrimmed = search.trim();
            const searchRegex = new RegExp(searchTrimmed, 'i'); // Case-insensitive
            const searchWithoutTones = removeVietnameseTones(searchTrimmed);
            const searchRegexWithoutTones = new RegExp(searchWithoutTones, 'i');
            
            // Tìm trong name, description, tag
            // Hỗ trợ cả có dấu và không dấu
            query.$or = [
                { name: searchRegex },
                { description: searchRegex },
                { tag: { $in: [searchRegex] } },
                // Tìm với không dấu
                { name: searchRegexWithoutTones },
                { description: searchRegexWithoutTones },
                { tag: { $in: [searchRegexWithoutTones] } },
            ];
            
            // Nếu search text có dấu, thêm regex không dấu
            if (searchWithoutTones !== searchTrimmed) {
                // Đã thêm ở trên
            }
        }

        // Tìm kiếm theo nguyên liệu
        if (ingredients) {
            // ingredients có thể là string hoặc array
            const ingredientList = Array.isArray(ingredients) ? ingredients : [ingredients];
            
            if (ingredientList.length > 0) {
                // Tìm các Ingredient có name match với danh sách nguyên liệu được chọn
                // Sử dụng $or với nhiều regex để tìm cả có dấu và không dấu
                const ingredientQueries = [];
                ingredientList.forEach(ing => {
                    const ingTrimmed = ing.trim();
                    const ingRegex = new RegExp(ingTrimmed, 'i');
                    const ingWithoutTones = removeVietnameseTones(ingTrimmed);
                    const ingRegexWithoutTones = new RegExp(ingWithoutTones, 'i');
                    
                    ingredientQueries.push(
                        { name: ingRegex },
                        { name: ingRegexWithoutTones }
                    );
                });
                
                // Tìm ingredient IDs từ tên
                const ingredientDocs = await Ingredient.find({
                    $or: ingredientQueries
                }).select('_id').lean();
                
                const ingredientIds = ingredientDocs.map(doc => doc._id);
                
                if (ingredientIds.length > 0) {
                    // Nếu đã có query $or từ search, cần combine với $and
                    if (query.$or) {
                        query.$and = [
                            { $or: query.$or },
                            { ingredients: { $in: ingredientIds } }
                        ];
                        delete query.$or;
                    } else {
                        // Tìm meals có chứa ít nhất một trong các ingredient này
                        query.ingredients = { $in: ingredientIds };
                    }
                } else {
                    // Nếu không tìm thấy ingredient nào, trả về empty array
                    query._id = { $in: [] }; // Force empty result
                }
            }
        }

        // Đếm tổng số kết quả
        const total = await Meal.countDocuments(query);

        // Lấy meals với pagination
        const meals = await Meal.find(query)
            .populate({ 
                path: "ingredients", 
                select: "name calories unit type image" 
            })
            .populate({ 
                path: "category", 
                select: "name description" 
            })
            .populate({ 
                path: "subCategory", 
                select: "name category" 
            })
            .skip((validatedPage - 1) * validatedLimit)
            .limit(validatedLimit)
            .lean();

        // Tạo pagination response
        const pagination = createPagination(validatedPage, validatedLimit, total);
        const response = createPaginatedResponse(
            meals, 
            pagination, 
            "Search meals successfully"
        );

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ 
            message: error.message || error, 
            error: true, 
            success: false 
        });
    }
};

/**
 * Tìm kiếm ingredients theo tên (helper function để frontend có thể autocomplete)
 * Query params: q (query string)
 */
exports.searchIngredients = async (req, res) => {
    try {
        const { q, limit = 20 } = req.query;
        
        if (!q || !q.trim()) {
            return res.status(200).json({ 
                success: true, 
                data: [],
                message: "Empty query" 
            });
        }

        const qTrimmed = q.trim();
        const searchRegex = new RegExp(qTrimmed, 'i');
        const qWithoutTones = removeVietnameseTones(qTrimmed);
        const searchRegexWithoutTones = new RegExp(qWithoutTones, 'i');
        
        const ingredients = await Ingredient.find({
            $or: [
                { name: searchRegex },
                { name: searchRegexWithoutTones }
            ]
        })
        .select('name calories unit type image')
        .limit(parseInt(limit, 10))
        .lean();

        return res.status(200).json({ 
            success: true, 
            data: ingredients,
            message: "Search ingredients successfully"
        });
    } catch (error) {
        return res.status(500).json({ 
            message: error.message || error, 
            error: true, 
            success: false 
        });
    }
};

