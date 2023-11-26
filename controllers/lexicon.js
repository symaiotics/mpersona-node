const express = require('express');
const router = express.Router();
const Lexicon = require('../models/Lexicon'); // Assuming Lexicon model is exported from the models directory


// Get all lexicon entries
exports.getLexicon = async function (req, res, next) {
    try {
        const lexiconEntries = await Lexicon.find({});
        res.status(200).json({message:'full lexicon', payload:lexiconEntries});
    } catch (error) {
        res.status(500).send({ message: "Error retrieving lexicon entries", error });
    }
};

// Add or update lexicon entries (admin only)
exports.updateLexicon = async function (req, res, next) {
    try {
        const { words } = req.body;
        if (!Array.isArray(words)) {
            return res.status(400).send({ message: "Invalid input. 'words' must be an array." });
        }
        const updates = words.map((word) => ({
            updateOne: {
                filter: { code: word.code },
                update: word,
                upsert: true
            }
        }));
        await Lexicon.bulkWrite(updates);
        res.status(200).send({ message: "Lexicon updated successfully" });
    } catch (error) {
        res.status(500).send({ message: "Error updating lexicon", error });
    }
};

// Delete lexicon entry (admin only)
exports.deleteLexicon = async function (req, res, next) {
    try {
        const { code } = req.params;
        const result = await Lexicon.deleteOne({ code });
        if (result.deletedCount === 0) {
            return res.status(404).send({ message: "Lexicon entry not found" });
        }
        res.status(200).send({ message: "Lexicon entry deleted successfully" });
    } catch (error) {
        res.status(500).send({ message: "Error deleting lexicon entry", error });
    }
};

