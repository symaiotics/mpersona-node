// models/Persona.js
const { v4: uuidv4 } = require('uuid');


const mongoose = require('mongoose');
const { Schema } = mongoose;


const { CategorySchema } = require('./Category');

const SkillSchema = new mongoose.Schema({
    uuid: {
        type: String,
        unique: false,
        required: true,
        default: uuidv4
    },

    code: { type: Number }, //numeric value
    alpha: { type: String }, //linguistic value

    label: {
        en: {
            type: String,
            required: false
        },
        fr: {
            type: String,
            required: false
        }
    },
    description: {
        en: {
            type: String,
            required: false
        },
        fr: {
            type: String,
            required: false
        }
    }
});

// const CategorySchema = new mongoose.Schema(
//     {
//         uuid: {
//             type: String,
//             unique: false,
//             required: true,
//             default: uuidv4
//         },
//         code: { type: Number, unique: false }, //numeric value
//         alpha: { type: String, unique: false }, //linguistic value
//         label: {
//             en: {
//                 type: String,
//                 required: false
//             },
//             fr: {
//                 type: String,
//                 required: false
//             }
//         }
//     });

const FileSchema = new mongoose.Schema(
    {
        uuid: {
            type: String,
            unique: false,
            required: true,
            default: uuidv4
        },
        label: {
            en: {
                type: String,
                required: false
            },
            fr: {
                type: String,
                required: false
            }
        },
        filename: { type: String, required: false },
        format: { type: String, required: false },
        createdBy: { type: String, required: false },
        momentCreated: { type: String, required: false },

    });

//A reference block is a block of text which has been extracted from some source and which is searchable and used as a system prompt
const ReferenceBlockSchema = new mongoose.Schema(
    {
        uuid: {
            type: String,
            unique: false,
            required: true,
            default: uuidv4
        },
        label: {
            en: {
                type: String,
                required: false
            },
            fr: {
                type: String,
                required: false
            }
        },
        sourceFileUuid: { type: String, required: false },
        createdBy: { type: String, required: false },
        momentCreated: { type: String, required: false },

    });

const PersonaSchema = new Schema({
    uuid: {
        type: String,
        unique: false,
        required: true,
        default: uuidv4
    },

    //Textual description
    name: {
        type: String,
        required: true,
        default: "New Persona"
    },
    description: {
        en: {
            type: String,
            required: false
        },
        fr: {
            type: String,
            required: false
        }
    },
    basePrompt: {
        type: String,
        required: false
    },

    //Arrays
    skills: {
        type: [SkillSchema],
        default: []
    },
    categories: {
        type: [CategorySchema],
        default: []
    },
    files: {
        type: [FileSchema],
        default: []
    },
    referenceBlocks: {
        type: [ReferenceBlockSchema],
        default: []
    },

    //Administrative 
    createdBy: {
        type: String,
        required: false
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    momentCreated: {
        type: Date,
        default: Date.now
    },


});

const Persona = mongoose.model('Persona', PersonaSchema);
module.exports = Persona;
