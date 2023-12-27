// localizedArrayField.js
const mongoose = require('mongoose');

const localizedArrayField = (fieldName) => ({
  type: [{
    en: { type: String, trim: true },
    fr: { type: String, trim: true }
  }],
  _id: false, // Disable automatic _id generation for this subdocument
  validate: {
    validator: function (array) {
      // Ensure the array is not null or undefined
      if (!array) return false;
      // Check that every item in the array has at least one of 'en' or 'fr' defined and is a string
      return array.every(item => item && (typeof item.en === 'string' || typeof item.fr === 'string'));
    },
    message: `Each item in ${fieldName} must have at least one of 'en' or 'fr' provided.`
  },
  default: []
});

module.exports = localizedArrayField;