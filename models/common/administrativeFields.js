const { Schema } = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const administrativeFields = {
    uuid: {
        type: String,
        unique: true,
        required: true,
        default: uuidv4
    },
    publishStatus: {
        type: String,
        enum: ['unpublished', 'proposedForPublishing', 'published', 'suspended'],
        default: 'unpublished'
    },
    publishedBy: {
        type: String
    },
    owners: {
        type: [{ type: String }],
        default: []
    },
    editors: {
        type: [{ type: String }],
        default: []
    },
    viewers: {
        type: [{ type: String }],
        default: []
    },
    ownerLink: {
        type: String
    },
    editorLink: {
        type: String
    },
    viewerLink: {
        type: String
    },
    createdBy: {
        type: String
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
};

module.exports = administrativeFields;