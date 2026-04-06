const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
    },
    logo: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      default: null,
    },
    theme: {
      primaryColor: {
        type: String,
        default: '#000000',
      },
      secondaryColor: {
        type: String,
        default: '#FFFFFF',
      },
      accentColor: {
        type: String,
        default: '#007bff',
      },
      darkMode: {
        type: Boolean,
        default: false,
      },
    },
    plans: [
      {
        planId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          refPath: 'plans.planType',
        },
        planType: {
          type: String,
          enum: ['DataPlan', 'XpresDataOffer', 'DigimallOffer', 'TopzaOffer'],
          default: 'DataPlan',
        },
        customPrice: {
          type: Number,
          required: true,
          min: 0,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
        network: {
          type: String,
          ref: 'DataPlan',
          default: null,
        },
        dataSize: {
          type: String,
          default: null,
        },
      },
    ],
    checkerProducts: [
      {
        checkerId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: 'TopzaCheckerOffer',
        },
        customPrice: {
          type: Number,
          required: true,
          min: 0,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],
    socialLinks: {
      whatsapp: {
        value: {
          type: String,
          default: null,
        },
        label: {
          type: String,
          default: 'WhatsApp',
        },
      },
      phone: {
        value: {
          type: String,
          default: null,
        },
        label: {
          type: String,
          default: 'Phone',
        },
      },
      email: {
        value: {
          type: String,
          default: null,
        },
        label: {
          type: String,
          default: 'Email',
        },
      },
      facebook: {
        value: {
          type: String,
          default: null,
        },
        label: {
          type: String,
          default: 'Facebook',
        },
      },
      instagram: {
        value: {
          type: String,
          default: null,
        },
        label: {
          type: String,
          default: 'Instagram',
        },
      },
      twitter: {
        value: {
          type: String,
          default: null,
        },
        label: {
          type: String,
          default: 'Twitter',
        },
      },
    },
    content: {
      heroBadge: {
        type: String,
        default: 'Welcome',
      },
      heroTitle: {
        type: String,
        default: 'My Store',
      },
      heroSubtitle: {
        type: String,
        default: 'Get the best deals on data bundles',
      },
      heroImage: {
        type: String,
        default: '',
      },
      features: [
        {
          title: String,
          description: String,
          icon: String,
        },
      ],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isTemporarilyBanned: {
      type: Boolean,
      default: false,
    },
    temporaryBanReason: {
      type: String,
      default: null,
    },
    temporaryBanUntil: {
      type: Date,
      default: null,
    },
    temporaryBanBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    totalRevenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalOrders: {
      type: Number,
      default: 0,
      min: 0,
    },
    hasSocialLinks: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Store', storeSchema);
