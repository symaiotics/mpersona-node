var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var AccountSchema = new mongoose.Schema({

  //User information
  uuid: { type: String, unique: true, required: true }, //the unique username of this user
  username: { type: String, unique: true, required: true }, //the unique username of this user
  password: { type: String, required: true }, //a hashed password
  salt: { type: String, required: true }, //a salt for the password
  email: { type: String, required: false }, //the unique email of this account
  useCase: { type: String, required: false },
  notes: { type: String, required: false },
  preferredLng: { type: String, required: false }, //the user's preferred language code
  roles: { type: [String], required: true, enum: ['user', 'contributor', 'owner', 'sysadmin'], }, //an array of roles for this account
  active: { type: Boolean, required: true }, //active:false means the account is paused or suspend the account temporarily

  //Integrations
  openAi: { type: String, required: false },
  shopify: { type: String, required: false },
  gmail: { type: String, required: false },

  //Account settings info
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



const Account = mongoose.model('Account', AccountSchema);
module.exports = Account;


