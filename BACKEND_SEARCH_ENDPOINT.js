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
            const searchRegex = new RegExp(search.trim(), 'i'); // Case-insensitive
            query.$or = [
                { name: searchRegex },
                { description: searchRegex },
                { tag: { $in: [searchRegex] } }, // Tìm trong tags
            ];
        }

        // Tìm kiếm theo nguyên liệu
        if (ingredients) {
            // ingredients có thể là string hoặc array
            const ingredientList = Array.isArray(ingredients) ? ingredients : [ingredients];
            
            if (ingredientList.length > 0) {
                // Tìm các Ingredient có name match với danh sách nguyên liệu được chọn
                const ingredientRegexList = ingredientList.map(ing => 
                    new RegExp(ing.trim(), 'i')
                );
                
                // Tìm ingredient IDs từ tên
                const ingredientDocs = await Ingredient.find({
                    name: { $in: ingredientRegexList }
                }).select('_id').lean();
                
                const ingredientIds = ingredientDocs.map(doc => doc._id);
                
                if (ingredientIds.length > 0) {
                    // Tìm meals có chứa ít nhất một trong các ingredient này
                    query.ingredients = { $in: ingredientIds };
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

        const searchRegex = new RegExp(q.trim(), 'i');
        const ingredients = await Ingredient.find({
            name: searchRegex
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
