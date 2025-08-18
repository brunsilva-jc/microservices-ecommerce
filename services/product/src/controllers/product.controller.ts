import { Context } from 'koa';
import { Product, IProduct } from '../models/product.model';
import { Category } from '../models/category.model';
import { AppError } from '../middleware/error.middleware';
import { Logger } from '../utils/logger';
import { CacheService } from '../services/cache.service';
import { config } from '../config';

const log = new Logger('ProductController');
const cache = new CacheService();

export class ProductController {
  async createProduct(ctx: Context) {
    const productData = ctx.request.body;
    const userId = ctx.user?.userId;

    // Verify category exists
    const category = await Category.findById(productData.category);
    if (!category) {
      throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
    }

    // Check if slug is unique
    if (productData.slug) {
      const existingProduct = await Product.findOne({ slug: productData.slug });
      if (existingProduct) {
        throw new AppError('Product slug already exists', 400, 'SLUG_EXISTS');
      }
    }

    // Create product
    const product = new Product({
      ...productData,
      createdBy: userId,
      vendorId: ctx.user?.role === 'vendor' ? userId : productData.vendorId,
    });

    await product.save();

    // Clear cache
    await cache.clearPattern('product:list:*');
    await cache.clearPattern('product:search:*');

    log.info(`Product created: ${product.slug}`);

    ctx.status = 201;
    ctx.body = {
      success: true,
      message: 'Product created successfully',
      data: { product },
    };
  }

  async getProducts(ctx: Context) {
    const {
      page = 1,
      limit = config.pagination.defaultLimit,
      sort = '-createdAt',
      category,
      subcategory,
      brand,
      minPrice,
      maxPrice,
      inStock,
      featured,
      search,
      tags,
    } = ctx.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = Math.min(parseInt(limit as string, 10), config.pagination.maxLimit);

    // Build query
    const query: any = { isActive: true };

    if (category) {
      query.category = category;
    }

    if (subcategory) {
      query.subcategory = subcategory;
    }

    if (brand) {
      query.brand = brand;
    }

    if (minPrice || maxPrice) {
      query.basePrice = {};
      if (minPrice) query.basePrice.$gte = parseFloat(minPrice as string);
      if (maxPrice) query.basePrice.$lte = parseFloat(maxPrice as string);
    }

    if (inStock === 'true') {
      query['stock.quantity'] = { $gt: 0 };
    }

    if (featured === 'true') {
      query.isFeatured = true;
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagArray };
    }

    if (search && search.toString().length >= config.search.minQueryLength) {
      query.$text = { $search: search.toString() };
    }

    // Check cache
    const cacheKey = `product:list:${JSON.stringify({ query, page: pageNum, limit: limitNum, sort })}`;
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      ctx.body = cachedData;
      return;
    }

    // Execute query
    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('category', 'name slug')
        .populate('subcategory', 'name slug')
        .sort(sort as string)
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum)
        .lean(),
      Product.countDocuments(query),
    ]);

    const response = {
      success: true,
      data: {
        products,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    };

    // Cache response
    await cache.set(cacheKey, response, config.redis.ttl.product);

    ctx.body = response;
  }

  async getProductById(ctx: Context) {
    const { id } = ctx.params;

    // Check cache
    const cacheKey = `product:${id}`;
    const cachedProduct = await cache.get(cacheKey);
    if (cachedProduct) {
      ctx.body = cachedProduct;
      return;
    }

    const product = await Product.findById(id)
      .populate('category', 'name slug')
      .populate('subcategory', 'name slug')
      .populate('vendorId', 'firstName lastName email')
      .lean();

    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    const response = {
      success: true,
      data: { product },
    };

    // Cache response
    await cache.set(cacheKey, response, config.redis.ttl.product);

    ctx.body = response;
  }

  async getProductBySlug(ctx: Context) {
    const { slug } = ctx.params;

    // Check cache
    const cacheKey = `product:slug:${slug}`;
    const cachedProduct = await cache.get(cacheKey);
    if (cachedProduct) {
      ctx.body = cachedProduct;
      return;
    }

    const product = await Product.findOne({ slug, isActive: true })
      .populate('category', 'name slug')
      .populate('subcategory', 'name slug')
      .populate('vendorId', 'firstName lastName email')
      .lean();

    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    const response = {
      success: true,
      data: { product },
    };

    // Cache response
    await cache.set(cacheKey, response, config.redis.ttl.product);

    ctx.body = response;
  }

  async updateProduct(ctx: Context) {
    const { id } = ctx.params;
    const updates = ctx.request.body;
    const userId = ctx.user?.userId;

    const product = await Product.findById(id);
    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    // Check permissions
    if (ctx.user?.role === 'vendor' && product.vendorId?.toString() !== userId) {
      throw new AppError('Unauthorized to update this product', 403, 'FORBIDDEN');
    }

    // If updating slug, check uniqueness
    if (updates.slug && updates.slug !== product.slug) {
      const existingProduct = await Product.findOne({ slug: updates.slug });
      if (existingProduct) {
        throw new AppError('Product slug already exists', 400, 'SLUG_EXISTS');
      }
    }

    // Update product
    Object.assign(product, updates);
    product.updatedBy = userId;
    await product.save();

    // Clear cache
    await cache.del(`product:${id}`);
    await cache.del(`product:slug:${product.slug}`);
    await cache.clearPattern('product:list:*');
    await cache.clearPattern('product:search:*');

    log.info(`Product updated: ${product.slug}`);

    ctx.body = {
      success: true,
      message: 'Product updated successfully',
      data: { product },
    };
  }

  async deleteProduct(ctx: Context) {
    const { id } = ctx.params;
    const userId = ctx.user?.userId;

    const product = await Product.findById(id);
    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    // Check permissions
    if (ctx.user?.role === 'vendor' && product.vendorId?.toString() !== userId) {
      throw new AppError('Unauthorized to delete this product', 403, 'FORBIDDEN');
    }

    // Soft delete by deactivating
    product.isActive = false;
    product.updatedBy = userId;
    await product.save();

    // Clear cache
    await cache.del(`product:${id}`);
    await cache.del(`product:slug:${product.slug}`);
    await cache.clearPattern('product:list:*');
    await cache.clearPattern('product:search:*');

    log.info(`Product deleted: ${product.slug}`);

    ctx.body = {
      success: true,
      message: 'Product deleted successfully',
    };
  }

  async searchProducts(ctx: Context) {
    const { q, limit = 20 } = ctx.query;

    if (!q || q.toString().length < config.search.minQueryLength) {
      throw new AppError(
        `Search query must be at least ${config.search.minQueryLength} characters`,
        400,
        'INVALID_QUERY'
      );
    }

    const limitNum = Math.min(parseInt(limit as string, 10), config.search.maxResults);

    // Check cache
    const cacheKey = `product:search:${q}:${limitNum}`;
    const cachedResults = await cache.get(cacheKey);
    if (cachedResults) {
      ctx.body = cachedResults;
      return;
    }

    // Perform text search
    const products = await Product.find(
      {
        $text: { $search: q.toString() },
        isActive: true,
      },
      {
        score: { $meta: 'textScore' },
      }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limitNum)
      .populate('category', 'name slug')
      .lean();

    const response = {
      success: true,
      data: {
        products,
        query: q,
        count: products.length,
      },
    };

    // Cache response
    await cache.set(cacheKey, response, config.redis.ttl.search);

    ctx.body = response;
  }

  async updateStock(ctx: Context) {
    const { id } = ctx.params;
    const { variantSku, quantity, operation = 'set' } = ctx.request.body;

    const product = await Product.findById(id);
    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    if (variantSku) {
      // Update variant stock
      const variant = product.variants.find(v => v.sku === variantSku);
      if (!variant) {
        throw new AppError('Variant not found', 404, 'VARIANT_NOT_FOUND');
      }

      switch (operation) {
        case 'increment':
          variant.stock += quantity;
          break;
        case 'decrement':
          variant.stock = Math.max(0, variant.stock - quantity);
          break;
        default:
          variant.stock = quantity;
      }
    } else {
      // Update main product stock
      switch (operation) {
        case 'increment':
          product.stock.quantity += quantity;
          break;
        case 'decrement':
          product.stock.quantity = Math.max(0, product.stock.quantity - quantity);
          break;
        default:
          product.stock.quantity = quantity;
      }
    }

    await product.save();

    // Clear cache
    await cache.del(`product:${id}`);
    await cache.del(`product:slug:${product.slug}`);

    log.info(`Stock updated for product: ${product.slug}`);

    ctx.body = {
      success: true,
      message: 'Stock updated successfully',
      data: {
        productId: product._id,
        stock: variantSku
          ? product.variants.find(v => v.sku === variantSku)?.stock
          : product.stock.quantity,
      },
    };
  }

  async getFeaturedProducts(ctx: Context) {
    const { limit = 10 } = ctx.query;
    const limitNum = Math.min(parseInt(limit as string, 10), 50);

    // Check cache
    const cacheKey = `product:featured:${limitNum}`;
    const cachedProducts = await cache.get(cacheKey);
    if (cachedProducts) {
      ctx.body = cachedProducts;
      return;
    }

    const products = await Product.find({
      isActive: true,
      isFeatured: true,
    })
      .sort('-rating.average -createdAt')
      .limit(limitNum)
      .populate('category', 'name slug')
      .lean();

    const response = {
      success: true,
      data: { products },
    };

    // Cache response
    await cache.set(cacheKey, response, config.redis.ttl.product);

    ctx.body = response;
  }

  async getRelatedProducts(ctx: Context) {
    const { id } = ctx.params;
    const { limit = 8 } = ctx.query;
    const limitNum = Math.min(parseInt(limit as string, 10), 20);

    const product = await Product.findById(id);
    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    // Check cache
    const cacheKey = `product:related:${id}:${limitNum}`;
    const cachedProducts = await cache.get(cacheKey);
    if (cachedProducts) {
      ctx.body = cachedProducts;
      return;
    }

    // Find related products based on category and tags
    const relatedProducts = await Product.find({
      _id: { $ne: id },
      isActive: true,
      $or: [
        { category: product.category },
        { tags: { $in: product.tags } },
      ],
    })
      .sort('-rating.average')
      .limit(limitNum)
      .populate('category', 'name slug')
      .lean();

    const response = {
      success: true,
      data: { products: relatedProducts },
    };

    // Cache response
    await cache.set(cacheKey, response, config.redis.ttl.product);

    ctx.body = response;
  }
}