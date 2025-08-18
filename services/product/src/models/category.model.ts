import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  parent?: mongoose.Types.ObjectId;
  image?: string;
  icon?: string;
  displayOrder: number;
  isActive: boolean;
  metadata?: Map<string, any>;
  seo: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: String,
    parent: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },
    image: String,
    icon: String,
    displayOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
    },
    seo: {
      title: String,
      description: String,
      keywords: [String],
    },
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

// Index for hierarchical queries
categorySchema.index({ parent: 1, displayOrder: 1 });

// Virtual for getting subcategories
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent',
});

// Virtual for getting product count
categorySchema.virtual('productCount', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'category',
  count: true,
});

// Method to get full category path
categorySchema.methods.getPath = async function (): Promise<ICategory[]> {
  const path: ICategory[] = [this];
  let current = this;
  
  while (current.parent) {
    current = await this.constructor.findById(current.parent);
    if (current) {
      path.unshift(current);
    } else {
      break;
    }
  }
  
  return path;
};

// Method to get all descendant categories
categorySchema.methods.getDescendants = async function (): Promise<ICategory[]> {
  const descendants: ICategory[] = [];
  const queue: ICategory[] = [this];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = await this.constructor.find({ parent: current._id });
    descendants.push(...children);
    queue.push(...children);
  }
  
  return descendants;
};

// Static method to generate slug
categorySchema.statics.generateSlug = function (name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
};

// Pre-save hook to generate slug if not provided
categorySchema.pre('save', async function (next) {
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
  
  next();
});

// Pre-remove hook to prevent deletion if category has products
categorySchema.pre('deleteOne', { document: true }, async function (next) {
  const Product = mongoose.model('Product');
  const productCount = await Product.countDocuments({ category: this._id });
  
  if (productCount > 0) {
    const error = new Error(`Cannot delete category with ${productCount} products`);
    return next(error);
  }
  
  // Also check for subcategories
  const subcategoryCount = await this.constructor.countDocuments({ parent: this._id });
  if (subcategoryCount > 0) {
    const error = new Error(`Cannot delete category with ${subcategoryCount} subcategories`);
    return next(error);
  }
  
  next();
});

export const Category = mongoose.model<ICategory>('Category', categorySchema);