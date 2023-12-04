//Accounts Controller
/*
The accounts controller contains the logic which processes API method received by the route
*/
//Load the specific controller plugins
const uuidv4 = require('uuid').v4;

//Error Handling
const ApiError = require('../error/ApiError');
const promiseHandler = require('../error/promiseHandler');

//Account Security
const jwt = require('jsonwebtoken');
const createJWT = require('../middleware/verify').createJWT;
const bcrypt = require('bcrypt');

//Load the Models
const Account = require('../models/account');
const MailingList = require('../models/MailingList');

exports.joinMailingList = async function (req, res, next) {
    try {
        let emailAddress = req.body.emailAddress || req.query.emailAddress;

        if (!emailAddress || !validateEmail(emailAddress)) {
            return res.status(400).json({ message: 'Invalid or No Email Address Provided' });
        }

        let newEmail = MailingList({ emailAddress });
        let result = await promiseHandler(newEmail.save(), 5000);

        if (result.success) {
            res.status(200).json({ message: "success", payload: result });
        } else {
            res.status(500).json({ message: "failure" });
        }
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


function validateEmail(email) {
    if (!email) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  }

// Accepts a new account and saves it to the database
exports.createNewAccount = async function (req, res, next) {

    //Plaintext passwords are kept separate from new account
    var password = req.body.password || req.query.password || req.params.password || null;
    var password2 = req.body.password2 || req.query.password2 || req.params.password2 || null;

    //New account document created
    var newAccount = {
        uuid: uuidv4(),
        username: req.body.username || req.query.username || req.params.username || null,
        email: req.body.email || req.query.email || req.params.email || null,
        useCase: req.body.useCase || req.query.useCase || req.params.useCase || null,
        notes: req.body.notes || req.query.notes || req.params.notes || null,
        preferredLng: req.body.preferredLng || req.query.preferredLng || req.params.preferredLng || 'en',
        roles: ['user'],
        active: true,
        momentCreated: new Date(),
    }

    //Verify the username is valid and not taken
    if (!newAccount.username) {
        console.log("No username found")
        return res.status(400).send(JSON.stringify({ message: 'noUsername', payload: null }));
    }
    else {
        var findAccount = await Account.findOne({ username: newAccount.username });
        if (findAccount) {
            console.log("User already exists")
            return res.status(400).send(JSON.stringify({ message: 'userExists', payload: null }));
        }
    }

    //Verify the password
    if (!password || password.length < 8 || password !== password2) {
        return res.status(400).send(JSON.stringify({ message: 'passwordsDontMatch', payload: null }));
    }

    //If everything checks out
    const salt = await bcrypt.genSalt(10);
    var hashedPassword = await bcrypt.hash(password, salt);
    newAccount.salt = salt;
    newAccount.password = hashedPassword;

    //Save the new account
    var doc = Account(newAccount);
    var results = await promiseHandler(doc.save(), 5000);

    //We need to return a result 
    if (results.success) {

        //Mint a token and do the login at the same time
        var newToken = createJWT(results.success, req.fullUrl)
        res.header('auth-token', newToken.token)
        res.header('auth-token-decoded', JSON.stringify(newToken.tokenDecoded))
        res.status(200).send(JSON.stringify({ message: "success", payload: { token: newToken.token, tokenDecoded: newToken.tokenDecoded } }))

    }
    else res.status(500).send(JSON.stringify({ message: "failure", payload: null }))
};


// Accepts a new account and saves it to the database
exports.login = async function (req, res, next) {
    try {
        //Variables
        var username = req.body.username || req.query.username || req.params.username || null;
        var password = req.body.password || req.query.password || req.params.password || null;

        //Verify Account
        var findAccount = await Account.findOne({ username: username });
        if (!findAccount) {
            return res.status(400).send(JSON.stringify({ message: 'usernameNotFound', payload: null }));
        }
        else //Account Found
        {
            bcrypt.compare(password, findAccount.password, async (err, isMatch) => {
                if (err) {
                    // throw err;
                    console.log("Password eval error");
                    return res.status(400).send(JSON.stringify({ message: 'passwordError', payload: null }));
                } else if (!isMatch) {
                    console.log("Password doesn't match!");
                    return res.status(400).send(JSON.stringify({ message: 'passwordNotFound', payload: null }));
                } else {
                    //Login Verified
                    //Update login information (last logged in)
                    //Update the user account information and remove password reset information if the login was successful
                    var toSet = {
                        $set: {
                            momentLastLogin: new Date(),
                            passwordResetRequired: null,
                            passwordResetRequested: null,
                            passwordResetToken: null,
                            momentPasswordResetTokenExpires: null,
                        }
                    }

                    //If this is the first login, note it with the dateTime
                    if (!findAccount.momentFirstLogin) toSet.momentFirstLogin = toSet.momentLastLogin;

                    //Update the login account
                    await Account.updateOne({ username: username }, toSet);

                    //Set the header to return
                    var newToken = createJWT(findAccount, req.fullUrl);
                    res.header('auth-token', newToken.token);
                    res.header('auth-token-decoded', JSON.stringify(newToken.tokenDecoded));

                    //TODO Insert token into logins collection

                    //Return a successful login
                    res.status(200).send(JSON.stringify({ message: "Success", payload: null }))
                }
            });
        }
    }
    catch (error) {
        console.log(error)
    }
};

