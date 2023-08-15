var mongoose = require('mongoose');

var accountSchema = new mongoose.Schema({

  //User information
  username: { type: String, unique : true, required: true }, //the unique username of this user
  name: { type: String, required: true }, //the user's display name
  email: { type: String, required: true }, //the unique email of this account

  //The user roles for this system
  //Altough we would think this would be type: Array, it is type Array of Strings, and must only contain the following enumerated values
  roles: { type: [String], required: true, enum: ['reader', 'contributor', 'owner', 'sysadmin'], }, //an array of roles for this account
  passwordHash: { type: String, required: false }, //a hashed password
  passwordSalt: { type: String, required: false }, //a salt for the password
  preferredLng: { type: String, required: false }, //the user's preferred language code

  //Account settings info
  active: { type: Boolean, required: true }, //active:false means the account is paused or suspend the account temporarily
  momentFirstLogin: { type: Date, required: false }, //the moment of the first login
  momentLastLogin: { type: Date, required: false }, //update the last login

  //Password Resets
  passwordResetRequired: { type: Boolean, required: false }, //Will force a password reset on login
  passwordResetRequested: { type: Boolean, required: false }, //Will provide the ability reset the password
  passwordResetToken: { type: String, required: false }, //Pass a password rest token
  momentPasswordResetTokenExpires: { type: Date, required: false }, //How long the token is good for

  //Time-based information
  momentCreated: Date,
  momentUpdated: Date,
  momentDeleted: Date,
}, { collection: 'accounts' });

module.exports = {
  accountSchema
};
