// localizedField.js
const mongoose = require('mongoose');

const localizedField = (fieldName) => ({
  type: {
    en: {
      type: String,
      trim: true
    },
    fr: {
      type: String,
      trim: true
    }
  },
  validate: {
    validator: function (v) {
      return v.en || v.fr;
    },
    message: `At least one of 'en' or 'fr' must be provided for ${fieldName}.`
  }
});

module.exports = localizedField;