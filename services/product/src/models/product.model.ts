import mongoose, { Document, Schema } from 'mongoose';

export interface IProductVariant {
  sku: string;
  attributes: Map<string, string>; // e.g., { size: 'M', color: 'Blue' }
  price: number;
  compareAtPrice?: number;
  stock: number;
  images?: string[];
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  category: mongoose.Types.ObjectId;
  subcategory?: mongoose.Types.ObjectId;
  brand?: string;
  tags: string[];
  basePrice: number;
  compareAtPrice?: number;
  currency: string;
  images: string[];
  variants: IProductVariant[];
  attributes: Map<string, string[]>; // e.g., { size: ['S', 'M', 'L'], color: ['Red', 'Blue'] }
  specifications?: Map<string, string>;
  isActive: boolean;
  isFeatured: boolean;
  rating: {
    average: number;
    count: number;
  };
  stock: {
    trackInventory: boolean;
    quantity: number;
    lowStockThreshold: number;
  };
  seo: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  vendorId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const productVariantSchema = new Schema<IProductVariant>({
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  attributes: {
    type: Map,
    of: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  compareAtPrice: {
    type: Number,
    min: 0,
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  images: [String],
  weight: Number,
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
  },
});

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    shortDescription: String,
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    subcategory: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
    },
    brand: {
      type: String,
      trim: true,
      index: true,
    },
    tags: {
      type: [String],
      index: true,
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    compareAtPrice: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
    },
    images: {
      type: [String],
      default: [],
    },
    variants: {
      type: [productVariantSchema],
      default: [],
    },
    attributes: {
      type: Map,
      of: [String],
      default: new Map(),
    },
    specifications: {
      type: Map,
      of: String,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    stock: {
      trackInventory: {
        type: Boolean,
        default: true,
      },
      quantity: {
        type: Number,
        default: 0,
        min: 0,
      },
      lowStockThreshold: {
        type: Number,
        default: 10,
        min: 0,
      },
    },
    seo: {
      title: String,
      description: String,
      keywords: [String],
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    publishedAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for search and filtering
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ basePrice: 1, rating: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ 'variants.sku': 1 });
productSchema.index({ 'stock.quantity': 1 });

// Virtual for total stock across all variants
productSchema.virtual('totalStock').get(function () {
  if (!this.stock.trackInventory) {
    return Infinity;
  }
  if (this.variants && this.variants.length > 0) {
    return this.variants.reduce((total, variant) => total + variant.stock, 0);
  }
  return this.stock.quantity;
});

// Virtual for price range
productSchema.virtual('priceRange').get(function () {
  if (this.variants && this.variants.length > 0) {
    const prices = this.variants.map(v => v.price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }
  return {
    min: this.basePrice,
    max: this.basePrice,
  };
});

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function () {
  if (this.compareAtPrice && this.compareAtPrice > this.basePrice) {
    return Math.round(((this.compareAtPrice - this.basePrice) / this.compareAtPrice) * 100);
  }
  return 0;
});

// Method to check if product is in stock
productSchema.methods.isInStock = function (): boolean {
  if (!this.stock.trackInventory) {
    return true;
  }
  return this.totalStock > 0;
};

// Method to check if product is low on stock
productSchema.methods.isLowStock = function (): boolean {
  if (!this.stock.trackInventory) {
    return false;
  }
  return this.totalStock <= this.stock.lowStockThreshold;
};

// Method to generate slug from name
productSchema.statics.generateSlug = function (name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
};

// Pre-save hook to generate slug if not provided
productSchema.pre('save', async function (next) {
  if (!this.slug && this.name) {
    const baseSlug = (this.constructor as any).generateSlug(this.name);
    let slug = baseSlug;
    let counter = 1;
    
    // Check if slug already exists
    while (await this.constructor.findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    this.slug = slug;
  }
  
  // Calculate total stock if variants exist
  if (this.variants && this.variants.length > 0 && this.stock.trackInventory) {
    this.stock.quantity = this.variants.reduce((total, variant) => total + variant.stock, 0);
  }
  
  next();
});

export const Product = mongoose.model<IProduct>('Product', productSchema);