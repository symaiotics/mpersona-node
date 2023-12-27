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
  _id: false, // Disable automatic _id generation for this subdocument
  validate: {
    validator: function (v) {
      // The object must have at least one non-empty string in 'en' or 'fr' properties
      return v && (
        (typeof v.en === 'string' && v.en.trim().length > 0) ||
        (typeof v.fr === 'string' && v.fr.trim().length > 0)
      );
    },
    message: `At least one of 'en' or 'fr' must be provided for ${fieldName}.`
  }
});

module.exports = localizedField;
