import mongoose, { Document, Schema } from 'mongoose';

export interface IReport extends Document {
  user: mongoose.Types.ObjectId;
  photo: string;
  imageId?: mongoose.Types.ObjectId;
  photoContentType?: string | null;
  // photoUrl?: string; // Removed: Only buffer storage
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  address?: string;
  wasteType: 'organic' | 'plastic' | 'paper' | 'metal' | 'glass' | 'electronic' | 'hazardous' | 'mixed' | 'other';
  predictedType?: string;
  confidence?: number;
  description: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'assigned' | 'in_progress' | 'collected' | 'resolved' | 'cancelled';
  assignedCollector?: mongoose.Types.ObjectId;
  assignedAt?: Date;
  collectedAt?: Date;
  resolvedAt?: Date;
  estimatedQuantity?: string;
  actualQuantity?: string;
  collectorNotes?: string;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    photo: {
      type: String,
      required: [true, 'Photo is required'],
    },
    imageId: {
      type: Schema.Types.ObjectId,
      ref: 'Image',
      required: false,
      default: null,
    },
    photoContentType: {
      type: String,
      required: false,
      default: null,
    },
    // photoUrl: { type: String, default: null }, // Removed: Only buffer storage
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: [true, 'Location coordinates are required'],
        validate: {
          validator: function(coords: number[]) {
            return coords.length === 2 && 
                   coords[0] >= -180 && coords[0] <= 180 && // longitude
                   coords[1] >= -90 && coords[1] <= 90;     // latitude
          },
          message: 'Invalid coordinates. Longitude must be between -180 and 180, latitude between -90 and 90',
        },
      },
    },
    address: {
      type: String,
      trim: true,
      maxlength: [200, 'Address cannot exceed 200 characters'],
    },
    wasteType: {
      type: String,
      enum: ['organic', 'plastic', 'paper', 'metal', 'glass', 'electronic', 'hazardous', 'mixed', 'other'],
      default: 'other',
    },
    predictedType: {
      type: String,
      default: null,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['pending', 'assigned', 'in_progress', 'collected', 'resolved', 'cancelled'],
      default: 'pending',
    },
    assignedCollector: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    collectedAt: {
      type: Date,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    estimatedQuantity: {
      type: String,
      trim: true,
      maxlength: [100, 'Estimated quantity cannot exceed 100 characters'],
    },
    actualQuantity: {
      type: String,
      trim: true,
      maxlength: [100, 'Actual quantity cannot exceed 100 characters'],
    },
    collectorNotes: {
      type: String,
      trim: true,
      maxlength: [500, 'Collector notes cannot exceed 500 characters'],
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: [500, 'Admin notes cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
reportSchema.index({ location: '2dsphere' }); // Geospatial index
reportSchema.index({ user: 1, createdAt: -1 });
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ assignedCollector: 1, status: 1 });
reportSchema.index({ wasteType: 1 });
reportSchema.index({ urgency: 1 });

// Virtual for populated user
reportSchema.virtual('userDetails', {
  ref: 'User',
  localField: 'user',
  foreignField: '_id',
  justOne: true,
});

// Virtual for populated collector
reportSchema.virtual('collectorDetails', {
  ref: 'User',
  localField: 'assignedCollector',
  foreignField: '_id',
  justOne: true,
});

// Middleware to update timestamps on status changes
reportSchema.pre('save', function (next) {
  const now = new Date();
  
  if (this.isModified('status')) {
    switch (this.status) {
      case 'assigned':
        if (!this.assignedAt) this.assignedAt = now;
        break;
      case 'collected':
        if (!this.collectedAt) this.collectedAt = now;
        break;
      case 'resolved':
        if (!this.resolvedAt) this.resolvedAt = now;
        break;
    }
  }
  
  next();
});

// Static method to find reports near a location
reportSchema.statics.findNearby = function(longitude: number, latitude: number, maxDistance: number = 5000) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        $maxDistance: maxDistance, // in meters
      },
    },
  });
};

export default mongoose.model<IReport>('Report', reportSchema);
