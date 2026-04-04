const Notification = require('../models/Notification');

const createNotification = async (notificationData) => {
  try {
    const notification = await Notification.create(notificationData);
    console.log(`[Notification] Created ${notificationData.type} notification`);
    return {
      success: true,
      data: notification,
    };
  } catch (error) {
    console.error('[Notification] Error creating notification:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, type = '', isRead = '', search = '' } = req.query;

    const filter = {};
    
    if (type) {
      filter.type = type;
    }
    
    if (isRead !== '') {
      filter.isRead = isRead === 'true';
    }
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
        { 'data.userName': { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalNotifications = await Notification.countDocuments(filter);
    const totalPages = Math.ceil(totalNotifications / parseInt(limit));

    const unreadCount = await Notification.countDocuments({ isRead: false });

    res.status(200).json({
      success: true,
      data: {
        notifications,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalNotifications,
          hasNextPage: parseInt(page) < totalPages,
        },
        stats: {
          unreadCount,
        },
      },
    });
  } catch (error) {
    console.error('getNotifications error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getNotificationStats = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({ isRead: false });
    const totalCount = await Notification.countDocuments();

    const typeBreakdown = await Notification.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
    ]);

    const recentNotifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        unreadCount,
        totalCount,
        typeBreakdown,
        recentNotifications,
      },
    });
  } catch (error) {
    console.error('getNotificationStats error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error('markAsRead error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { isRead: false },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('markAllAsRead error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndDelete(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    console.error('deleteNotification error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({});

    res.status(200).json({
      success: true,
      message: 'All notifications deleted',
    });
  } catch (error) {
    console.error('deleteAllNotifications error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  ...exports,
  createNotification,
};
