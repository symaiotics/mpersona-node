const express = require('express');
const router = express.Router();
const Lexicon = require('../models/Lexicon'); // Assuming Lexicon model is exported from the models directory
const ApiError = require('../error/ApiError');

// Get all lexicon entries
exports.getLexicon = async function (req, res, next) {
    try {
        const lexiconEntries = await Lexicon.find({}).sort({ code: 1 });
        res.status(200).json({ message: 'Full lexicon retrieved successfully', payload: lexiconEntries });
    } catch (error) {
        next(new ApiError.internal("Error retrieving lexicon entries")); // Use ApiError class
    }
};


//Update the lexicon with new words or changes
exports.updateLexicon = async function (req, res, next) {
    try {
        const { words } = req.body;
        if (!Array.isArray(words)) {
            throw ApiError.badRequest("Invalid input. 'words' must be an array.");
        }

        const isValidWord = (word) => {
            if (!word || typeof word !== 'object') return false;
            if (typeof word.code !== 'string' || word.code.trim() === '') return false;
            if (typeof word.word !== 'object' || word.word === null) return false;
            if (word.keywords && !Array.isArray(word.keywords)) return false;
            if (word.keywords && word.keywords.some(kw => typeof kw !== 'string')) return false;
            return true;
        };

        if (!words.every(isValidWord)) {
            throw ApiError.badRequest("Invalid input. Each 'word' must have a valid 'code', 'word' object, and an optional array of 'keywords'.");
        }

        const updates = words.map((word) => ({
            updateOne: {
                filter: { code: word.code },
                update: word,
                upsert: true
            }
        }));

        await Lexicon.bulkWrite(updates);
        res.status(200).json({ message: "Lexicon updated successfully", payload: null });
    } catch (error) {
        next(error instanceof ApiError ? error : ApiError.internal("Error updating lexicon"));
    }
};

// Delete lexicon entry (admin only)
exports.deleteLexicon = async function (req, res, next) {
    try {
        const { code } = req.params;
        const result = await Lexicon.deleteOne({ code });
        if (result.deletedCount === 0) {
            throw new ApiError.notFound("Lexicon entry not found"); // Use ApiError class
        }
        res.status(200).json({ message: "Lexicon entry deleted successfully", payload: null });
    } catch (error) {
        next(error.isOperational ? error : new ApiError.internal("Error deleting lexicon entry")); // Use ApiError class
    }
};