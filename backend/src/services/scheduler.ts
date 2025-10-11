import Report, { IReport } from '../models/Report';

export interface RoutePoint {
  report: IReport;
  distance: number;
  estimatedTime: number; // in minutes
}

export interface OptimizedRoute {
  reports: RoutePoint[];
  totalDistance: number;
  totalTime: number;
  startLocation?: {
    lat: number;
    lng: number;
  };
}

/**
 * Calculate distance between two points using Haversine formula
 */
const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Estimate travel time based on distance
 */
const estimateTravelTime = (distanceKm: number): number => {
  // Assume average speed of 30 km/h in urban areas
  const averageSpeedKmh = 30;
  const timeHours = distanceKm / averageSpeedKmh;
  return Math.round(timeHours * 60); // Convert to minutes
};

/**
 * Simple nearest-first algorithm for route optimization
 */
export const optimizeRouteNearestFirst = async (
  collectorId: string,
  startLat?: number,
  startLng?: number
): Promise<OptimizedRoute> => {
  try {
    // Get all assigned reports for the collector
    const reports = await Report.find({
      assignedCollector: collectorId,
      status: { $in: ['assigned', 'in_progress'] },
    }).populate('user', 'name email phone');

    if (reports.length === 0) {
      return {
        reports: [],
        totalDistance: 0,
        totalTime: 0,
      };
    }

    // If no start location provided, use first report location
    let currentLat = startLat || reports[0].location.coordinates[1];
    let currentLng = startLng || reports[0].location.coordinates[0];

    const optimizedRoute: RoutePoint[] = [];
    const remainingReports = [...reports];
    let totalDistance = 0;
    let totalTime = 0;

    // Nearest-first algorithm
    while (remainingReports.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = Infinity;

      // Find nearest report
      for (let i = 0; i < remainingReports.length; i++) {
        const report = remainingReports[i];
        const distance = calculateDistance(
          currentLat,
          currentLng,
          report.location.coordinates[1], // latitude
          report.location.coordinates[0]  // longitude
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }

      // Add nearest report to route
      const nearestReport = remainingReports[nearestIndex];
      const travelTime = estimateTravelTime(nearestDistance);
      const collectionTime = estimateCollectionTime(nearestReport);

      optimizedRoute.push({
        report: nearestReport,
        distance: nearestDistance,
        estimatedTime: travelTime + collectionTime,
      });

      totalDistance += nearestDistance;
      totalTime += travelTime + collectionTime;

      // Update current position
      currentLat = nearestReport.location.coordinates[1];
      currentLng = nearestReport.location.coordinates[0];

      // Remove from remaining reports
      remainingReports.splice(nearestIndex, 1);
    }

    return {
      reports: optimizedRoute,
      totalDistance: Math.round(totalDistance * 100) / 100, // Round to 2 decimal places
      totalTime,
      startLocation: startLat && startLng ? { lat: startLat, lng: startLng } : undefined,
    };
  } catch (error) {
    console.error('Route optimization error:', error);
    throw new Error('Failed to optimize route');
  }
};

/**
 * Estimate collection time based on waste type and urgency
 */
const estimateCollectionTime = (report: IReport): number => {
  let baseTime = 15; // Base collection time in minutes

  // Adjust based on waste type
  switch (report.wasteType) {
    case 'hazardous':
      baseTime += 20; // Extra time for hazardous waste
      break;
    case 'electronic':
      baseTime += 10; // Extra time for electronic waste
      break;
    case 'mixed':
      baseTime += 5; // Extra time for sorting
      break;
    default:
      break;
  }

  // Adjust based on urgency
  switch (report.urgency) {
    case 'critical':
      baseTime += 10; // More careful handling
      break;
    case 'high':
      baseTime += 5;
      break;
    default:
      break;
  }

  return baseTime;
};

/**
 * Get reports within a radius of a location
 */
export const getReportsNearLocation = async (
  lat: number,
  lng: number,
  radiusKm: number = 5,
  status?: string[]
): Promise<IReport[]> => {
  try {
    const query: any = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat], // GeoJSON uses [longitude, latitude]
          },
          $maxDistance: radiusKm * 1000, // Convert km to meters
        },
      },
    };

    if (status && status.length > 0) {
      query.status = { $in: status };
    }

    const reports = await Report.find(query)
      .populate('user', 'name email phone')
      .populate('assignedCollector', 'name email phone');

    return reports;
  } catch (error) {
    console.error('Get reports near location error:', error);
    throw new Error('Failed to get reports near location');
  }
};

/**
 * Calculate optimal assignment of reports to collectors
 */
export const optimizeCollectorAssignments = async (
  collectorIds: string[],
  reportIds: string[]
): Promise<{ [collectorId: string]: string[] }> => {
  try {
    // Get collectors and reports
    const reports = await Report.find({ _id: { $in: reportIds } });
    
    if (collectorIds.length === 0 || reports.length === 0) {
      return {};
    }

    // Simple round-robin assignment for now
    // In a real-world scenario, you'd consider collector locations, capacity, etc.
    const assignments: { [collectorId: string]: string[] } = {};
    
    // Initialize assignments
    collectorIds.forEach(id => {
      assignments[id] = [];
    });

    // Assign reports in round-robin fashion
    reports.forEach((report, index) => {
      const collectorIndex = index % collectorIds.length;
      const collectorId = collectorIds[collectorIndex];
      assignments[collectorId].push(report._id.toString());
    });

    return assignments;
  } catch (error) {
    console.error('Optimize collector assignments error:', error);
    throw new Error('Failed to optimize collector assignments');
  }
};

/**
 * Get route statistics for a collector
 */
export const getRouteStatistics = async (collectorId: string): Promise<{
  totalReports: number;
  pendingReports: number;
  inProgressReports: number;
  completedToday: number;
  estimatedTimeRemaining: number;
}> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalReports, pendingReports, inProgressReports, completedToday] = await Promise.all([
      Report.countDocuments({ assignedCollector: collectorId }),
      Report.countDocuments({ 
        assignedCollector: collectorId, 
        status: 'assigned' 
      }),
      Report.countDocuments({ 
        assignedCollector: collectorId, 
        status: 'in_progress' 
      }),
      Report.countDocuments({
        assignedCollector: collectorId,
        status: 'collected',
        collectedAt: { $gte: today, $lt: tomorrow }
      }),
    ]);

    // Estimate remaining time based on pending and in-progress reports
    const remainingReports = pendingReports + inProgressReports;
    const estimatedTimeRemaining = remainingReports * 20; // 20 minutes average per report

    return {
      totalReports,
      pendingReports,
      inProgressReports,
      completedToday,
      estimatedTimeRemaining,
    };
  } catch (error) {
    console.error('Get route statistics error:', error);
    throw new Error('Failed to get route statistics');
  }
};

export default {
  optimizeRouteNearestFirst,
  getReportsNearLocation,
  optimizeCollectorAssignments,
  getRouteStatistics,
};
