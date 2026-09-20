import { Server } from 'socket.io';

let io;

// In-memory store for active drivers.
// In production with multiple server instances, use Redis instead.
const activeDrivers = new Map();

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Driver connects and joins the "drivers" room
    socket.on('driver_connect', (data) => {
      const { driverId, name, vehicleNumber, lat, lng } = data;
      if (!driverId) return;

      activeDrivers.set(driverId, {
        socketId: socket.id,
        driverId,
        name,
        vehicleNumber,
        location: { lat, lng },
        lastUpdated: new Date()
      });

      socket.join('drivers');
      // Broadcast to admins that a new driver is online
      io.to('admins').emit('admin_driver_update', Array.from(activeDrivers.values()));
      console.log(`Driver ${name} connected. Total drivers online: ${activeDrivers.size}`);
    });

    // Driver updates their location
    socket.on('update_location', (data) => {
      const { driverId, lat, lng } = data;
      if (activeDrivers.has(driverId)) {
        const driverData = activeDrivers.get(driverId);
        driverData.location = { lat, lng };
        driverData.lastUpdated = new Date();
        activeDrivers.set(driverId, driverData);

        // Broadcast updated location to admins
        io.to('admins').emit('admin_driver_update', Array.from(activeDrivers.values()));
      }
    });

    // Admin joins to monitor drivers
    socket.on('admin_connect', () => {
      socket.join('admins');
      // Send current state of all drivers immediately
      socket.emit('admin_driver_update', Array.from(activeDrivers.values()));
      console.log(`Admin joined tracking. Socket: ${socket.id}`);
    });

    socket.on('disconnect', () => {
      // Find if this was a driver and remove them
      for (const [driverId, driverData] of activeDrivers.entries()) {
        if (driverData.socketId === socket.id) {
          activeDrivers.delete(driverId);
          console.log(`Driver ${driverData.name} disconnected. Total drivers online: ${activeDrivers.size}`);
          io.to('admins').emit('admin_driver_update', Array.from(activeDrivers.values()));
          break;
        }
      }
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

export const getActiveDrivers = () => {
  return Array.from(activeDrivers.values());
};
