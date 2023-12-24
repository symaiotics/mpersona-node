// localizedArrayField.js
const mongoose = require('mongoose');

const localizedArrayField = (fieldName) => ({
  type: [{
    en: { type: String, trim: true },
    fr: { type: String, trim: true }
  }],
  validate: {
    validator: function (array) {
      return array.every(item => item.en || item.fr);
    },
    message: `Each item in ${fieldName} must have at least one of 'en' or 'fr' provided.`
  },
  default: []
});

module.exports = localizedArrayField;