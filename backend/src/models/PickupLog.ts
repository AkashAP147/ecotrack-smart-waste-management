import mongoose, { Document, Schema } from 'mongoose';

export interface IPickupLog extends Document {
  report: mongoose.Types.ObjectId;
  collector: mongoose.Types.ObjectId;
  startTime: Date;
  endTime?: Date;
  actualQuantity?: string;
  wasteTypeConfirmed?: string;
  notes?: string;
  photos?: string[];
  status: 'started' | 'completed' | 'failed';
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const pickupLogSchema = new Schema<IPickupLog>(
  {
    report: {
      type: Schema.Types.ObjectId,
      ref: 'Report',
      required: [true, 'Report is required'],
    },
    collector: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Collector is required'],
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: null,
    },
    actualQuantity: {
      type: String,
      trim: true,
      maxlength: [100, 'Actual quantity cannot exceed 100 characters'],
    },
    wasteTypeConfirmed: {
      type: String,
      enum: ['organic', 'plastic', 'paper', 'metal', 'glass', 'electronic', 'hazardous', 'mixed', 'other'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    photos: [{
      type: String,
    }],
    status: {
      type: String,
      enum: ['started', 'completed', 'failed'],
      default: 'started',
    },
    failureReason: {
      type: String,
      trim: true,
      maxlength: [200, 'Failure reason cannot exceed 200 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
pickupLogSchema.index({ report: 1 });
pickupLogSchema.index({ collector: 1, createdAt: -1 });
pickupLogSchema.index({ status: 1 });
pickupLogSchema.index({ startTime: 1 });

// Virtual for populated report
pickupLogSchema.virtual('reportDetails', {
  ref: 'Report',
  localField: 'report',
  foreignField: '_id',
  justOne: true,
});

// Virtual for populated collector
pickupLogSchema.virtual('collectorDetails', {
  ref: 'User',
  localField: 'collector',
  foreignField: '_id',
  justOne: true,
});

// Calculate duration virtual
pickupLogSchema.virtual('duration').get(function() {
  if (this.endTime && this.startTime) {
    return Math.round((this.endTime.getTime() - this.startTime.getTime()) / (1000 * 60)); // in minutes
  }
  return null;
});

// Middleware to set endTime when status changes to completed or failed
pickupLogSchema.pre('save', function (next) {
  if (this.isModified('status') && (this.status === 'completed' || this.status === 'failed')) {
    if (!this.endTime) {
      this.endTime = new Date();
    }
  }
  next();
});

export default mongoose.model<IPickupLog>('PickupLog', pickupLogSchema);
